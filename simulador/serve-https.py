"""Servidor HTTPS estático para una red de clase de confianza. Sin dependencias."""
import argparse
import functools
import http.server
import ssl
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--cert', required=True)
parser.add_argument('--key', required=True)
parser.add_argument('--port', type=int, default=8443)
args = parser.parse_args()
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(Path(__file__).parent))
server = http.server.ThreadingHTTPServer(('0.0.0.0', args.port), handler)
context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain(args.cert, args.key)
server.socket = context.wrap_socket(server.socket, server_side=True)
print(f'Servidor HTTPS en puerto {args.port}; usa la IP LAN del computador y un certificado confiable.')
server.serve_forever()
