import pg8000
import urllib.parse
import ssl

db_url = "postgresql://postgres:3Reh@n@987%@db.eznrxzbievvkyjvvdeps.supabase.co:6543/postgres"

# Parse database URL
url = urllib.parse.urlparse(db_url)
username = url.username
password = url.password
database = url.path[1:]
hostname = url.hostname
port = url.port

print(f"Connecting to {hostname}:{port}/{database} with SSL...")

try:
    ssl_context = ssl.create_default_context()
    ssl_context.check_hostname = False
    ssl_context.verify_mode = ssl.CERT_NONE

    conn = pg8000.connect(
        user=username,
        password=password,
        host=hostname,
        port=port,
        database=database,
        ssl_context=ssl_context,
        timeout=10
    )
    print("Success on port 6543!")
    conn.close()
except Exception as e:
    print(f"Error on port 6543: {e}")
