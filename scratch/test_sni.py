import socket
import ssl

host = "db.eznrxzbievvkyjvvdeps.supabase.co"
port = 5432

print(f"Connecting to {host}:{port}...")
try:
    s = socket.create_connection((host, port), timeout=5)
    print("Socket connected. Sending SSLRequest package...")
    
    # Send SSLRequest payload (8 bytes: length=8, protocol version=80877103)
    s.sendall(bytes([0, 0, 0, 8, 4, 210, 22, 47]))
    resp = s.recv(1)
    print(f"Server response to SSLRequest: {resp}")
    
    if resp == b'S':
        print("Server accepted SSL upgrade. Wrapping socket with SSL context and SNI...")
        context = ssl.create_default_context()
        context.check_hostname = False
        context.verify_mode = ssl.CERT_NONE
        
        # wrap socket with server_hostname (SNI)
        secure_conn = context.wrap_socket(s, server_hostname=host)
        print("Success! SSL Handshake completed successfully with SNI.")
        secure_conn.close()
    else:
        print("Server rejected SSL upgrade.")
        s.close()
except Exception as e:
    print(f"Error during SSL handshake: {e}")
