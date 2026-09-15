# CI/CD Workflows

## docker-publish.yml — Build and Publish Docker Images

**Triggers:** push to `main`, new tags (`v*.*.*`), pull requests to `main` (build only, nothing is pushed).

Builds multi-arch Docker images (amd64, arm64) and pushes to GitHub Container Registry.

**Automatic tags:**

```
# Push to main
ghcr.io/alexzafra13/echo:latest
ghcr.io/alexzafra13/echo:main
ghcr.io/alexzafra13/echo:sha-<short sha>

# Tag v1.2.3
ghcr.io/alexzafra13/echo:1.2.3
ghcr.io/alexzafra13/echo:1.2
ghcr.io/alexzafra13/echo:1
ghcr.io/alexzafra13/echo:sha-<short sha>
```

`latest` only moves on pushes to `main`; a version tag does not update it.

## docker-test.yml — Docker Build Tests

**Triggers:** pull requests modifying Docker files.

Validates that `docker build` and `docker-compose` configs succeed before merge.

## ci.yml — Continuous Integration

**Triggers:** push and pull requests to `main`.

Checks that migrations are registered, then runs the API unit, integration and E2E tests and the web tests (Vitest), and builds both packages. Two follow-up jobs reuse the build artifacts: browser E2E with Playwright and Lighthouse CI. Linting is not part of CI; run `pnpm lint` in `api/` and `web/` before opening a PR.

## Releasing a New Version

```bash
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0
```

GitHub Actions will automatically build and push the tagged image.

## Secrets

- `GITHUB_TOKEN` — Provided automatically by GitHub, no setup needed.

## Troubleshooting

| Issue             | Fix                                                                            |
| ----------------- | ------------------------------------------------------------------------------ |
| Build fails       | Check workflow logs in Actions tab. Test locally with `docker build -t test .` |
| Permission denied | Settings > Actions > General > Workflow permissions > Read and write           |
| Tags not created  | Ensure tag matches `v*.*.*` pattern                                            |
