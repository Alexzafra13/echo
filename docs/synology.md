# Synology NAS — Troubleshooting

Echo runs on Synology DSM 7.2+ via Container Manager. Standard `docker compose up -d` works in most cases, but Synology has a handful of known quirks that can cause install failures.

## Symptom: Echo container stuck "Waiting for database connection…"

The API logs show repeating:

```
⏳ Waiting for PostgreSQL...
   Waiting for database connection... (1/90)
   Waiting for database connection... (2/90)
   ...
```

Postgres itself starts fine, but Echo never reaches it. Most common causes on Synology:

### 1. DNS broken on user-defined bridge networks (most common)

Synology Container Manager sometimes fails to set up DNS on user-defined bridge networks, so containers can't resolve each other by service name. Since v1.0.5, the entrypoint logs the result of `getent hosts postgres` every 10 retries:

- `DNS RESOLUTION FAILED` → this is the bug. Try:
  1. **Restart Container Manager** from DSM Package Center. This re-creates the bridge DNS and fixes it in most cases.
  2. If that doesn't work, `docker network rm echo-network` and `docker compose up -d` again to recreate the network fresh.
  3. As a last resort, a full DSM reboot.

Reference: [markdumay/synology-docker#35](https://github.com/markdumay/synology-docker/issues/35), [restyaboard thread on SynoForum](https://www.synoforum.com/threads/docker-restyaboard-problem.2289/).

### 2. DSM Firewall blocking inter-container traffic

If you have the Synology Firewall enabled with a restrictive ruleset, it can block containers from talking to each other on the bridge network.

Fix: Control Panel → Security → Firewall → add a rule allowing the docker bridge subnet (typically `172.16.0.0/12`), or disable the firewall temporarily to confirm this is the cause.

### 3. Slow disk initialization

On older / HDD-only Synology models, the first `docker compose up` can take several minutes — PostgreSQL bootstraps the cluster while Echo is already waiting. v1.0.5 extends the healthcheck `start-period` to 300s to accommodate this. If the first start still fails, a second `docker compose up -d` typically works.

## Recommended resource limits

- **RAM**: 2 GB free minimum (4 GB recommended). The DS118/DS119 with 1 GB is below spec.
- **Shared memory**: handled automatically — the compose file sets `shm_size: 256m` for Postgres (required; Docker's default 64 MB can crash Postgres on library scans).

## Symptom: `dependency failed to start: container for service is unhealthy`

DSM 7.2 Container Manager occasionally doesn't honor `depends_on: condition: service_healthy` cleanly, especially on first launch before the healthcheck `start-period` expires.

Workaround: run `docker compose up -d` a second time after ~30 seconds. Postgres will be healthy by then and Echo will start normally.

Reference: [wger-project/docker#67](https://github.com/wger-project/docker/issues/67).

## PUID / PGID permissions

If Echo can't write to mounted music folders, set `PUID` and `PGID` in the compose file to match your Synology user:

```yaml
environment:
  PUID: 1026  # id -u on the NAS for your user
  PGID: 100   # id -g on the NAS for your user
```

Find the IDs by SSH-ing into the NAS and running `id $(whoami)`.
