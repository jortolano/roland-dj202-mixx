"""List Mixxx PortAudio devices; optionally check output streams without starting playback."""
import argparse
import ctypes as c
import json
import os
from pathlib import Path


class Device(c.Structure):
    _fields_ = [
        ('version', c.c_int), ('name', c.c_char_p), ('host', c.c_int),
        ('inputs', c.c_int), ('outputs', c.c_int),
        ('low_input_latency', c.c_double), ('low_output_latency', c.c_double),
        ('high_input_latency', c.c_double), ('high_output_latency', c.c_double),
        ('sample_rate', c.c_double),
    ]


class Host(c.Structure):
    _fields_ = [
        ('version', c.c_int), ('type', c.c_int), ('name', c.c_char_p),
        ('devices', c.c_int), ('default_input', c.c_int), ('default_output', c.c_int),
    ]


class StreamParameters(c.Structure):
    _fields_ = [('device', c.c_int), ('channels', c.c_int), ('format', c.c_ulong),
                ('latency', c.c_double), ('host_info', c.c_void_p)]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dll', default='D:/Mixx/portaudio.dll')
    parser.add_argument('--check-outputs', type=int, nargs='+')
    parser.add_argument('--rate', type=float, default=48000)
    args = parser.parse_args()
    dll = Path(args.dll).resolve()
    with os.add_dll_directory(str(dll.parent)):
        pa = c.CDLL(str(dll))
        pa.Pa_GetDeviceInfo.restype = c.POINTER(Device)
        pa.Pa_GetHostApiInfo.restype = c.POINTER(Host)
        result = pa.Pa_Initialize()
        if result:
            raise RuntimeError(f'Pa_Initialize: {result}')
        try:
            count = pa.Pa_GetDeviceCount()
            if count < 0:
                raise RuntimeError(f'Pa_GetDeviceCount: {count}')
            devices = []
            for index in range(count):
                device = pa.Pa_GetDeviceInfo(index).contents
                if not device.outputs:
                    continue
                host = pa.Pa_GetHostApiInfo(device.host).contents
                devices.append({
                    'index': index, 'name': device.name.decode('utf-8', errors='replace'),
                    'api': host.name.decode('utf-8', errors='replace'),
                    'default_for_api': host.default_output == index,
                    'outputs': device.outputs, 'sample_rate': device.sample_rate,
                })
            print(json.dumps(devices, ensure_ascii=True, indent=2))
            if args.check_outputs:
                pa.Pa_OpenStream.argtypes = [c.POINTER(c.c_void_p), c.c_void_p,
                    c.POINTER(StreamParameters), c.c_double, c.c_ulong, c.c_ulong,
                    c.c_void_p, c.c_void_p]
                pa.Pa_CloseStream.argtypes = [c.c_void_p]
                handles = []
                try:
                    for index in args.check_outputs:
                        device = pa.Pa_GetDeviceInfo(index)
                        if not device or device.contents.outputs < 2:
                            raise ValueError(f'Not a stereo output: {index}')
                        params = StreamParameters(index, 2, 1, 0.05, None)
                        handle = c.c_void_p()
                        result = pa.Pa_OpenStream(c.byref(handle), None, c.byref(params),
                                                 args.rate, 1024, 0, None, None)
                        if result:
                            raise RuntimeError(f'Pa_OpenStream({index}): {result}')
                        handles.append(handle)
                    print(f'OK: outputs {args.check_outputs} opened simultaneously at '
                          f'{args.rate:g} Hz; playback was not started.')
                finally:
                    for handle in reversed(handles):
                        pa.Pa_CloseStream(handle)
        finally:
            pa.Pa_Terminate()


if __name__ == '__main__':
    main()
