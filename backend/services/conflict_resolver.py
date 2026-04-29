from datetime import timezone

def resolve(client_data, server_data):
    client_ts = client_data["timestamp"]
    server_ts = server_data.updated_at

    # 🔥 Normalize both to UTC-aware
    if client_ts.tzinfo is None:
        client_ts = client_ts.replace(tzinfo=timezone.utc)

    if server_ts.tzinfo is None:
        server_ts = server_ts.replace(tzinfo=timezone.utc)

    if client_ts > server_ts:
        return "client"
    return "server"