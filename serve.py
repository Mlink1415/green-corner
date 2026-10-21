import http.server
import os
import socketserver

os.chdir(os.path.dirname(os.path.abspath(__file__)))
PORT = 8010


class MayChuDaLuong(socketserver.ThreadingMixIn, http.server.HTTPServer):
    """Phục vụ nhiều yêu cầu cùng lúc (giống máy chủ thật): file âm thanh lớn không làm nghẽn các yêu cầu nhỏ."""
    daemon_threads = True
    allow_reuse_address = True


if __name__ == "__main__":
    MayChuDaLuong(("", PORT), http.server.SimpleHTTPRequestHandler).serve_forever()
