#!/usr/bin/env bash
set -Eeuo pipefail

# Deploy a prebuilt Astro archive to the Rocky Linux host.
# Run this script through sudo; the login account can remain unprivileged.
archive_path="${1:?usage: deploy-server.sh <dist.tar.gz> <nginx.conf>}"
nginx_config_path="${2:?usage: deploy-server.sh <dist.tar.gz> <nginx.conf>}"
deploy_id="$(date +%Y%m%d-%H%M%S)"
site_root="/srv/myweb"
staging_root="/srv/myweb.deploy-${deploy_id}"
backup_root="/srv/firefly-backups"
backup_path="${backup_root}/myweb-${deploy_id}"
nginx_target="/etc/nginx/conf.d/blog.eysnter.cn.conf"

test -f "${archive_path}"
test -f "${nginx_config_path}"

install -d -m 0755 "${staging_root}" "${backup_root}"
tar -xzf "${archive_path}" -C "${staging_root}"
test -f "${staging_root}/index.html"

chown -R root:root "${staging_root}"
find "${staging_root}" -type d -exec chmod 0755 {} +
find "${staging_root}" -type f -exec chmod 0644 {} +

install -m 0644 "${nginx_config_path}" "${nginx_target}"
nginx -t

if test -e "${site_root}"; then
    mv "${site_root}" "${backup_path}"
fi
mv "${staging_root}" "${site_root}"

# The local semanage rule for /srv/myweb maps the deployed tree to the
# httpd_sys_content_t type required by nginx while SELinux is enforcing.
restorecon -RF "${site_root}"

if ! nginx -t; then
    mv "${site_root}" "${backup_root}/failed-${deploy_id}"
    if test -e "${backup_path}"; then
        mv "${backup_path}" "${site_root}"
        restorecon -RF "${site_root}"
    fi
    exit 1
fi

systemctl enable --now nginx

printf 'deployment_id=%s\n' "${deploy_id}"
printf 'site_root=%s\n' "${site_root}"
printf 'backup=%s\n' "${backup_path}"
curl --fail --silent --show-error --head --header 'Host: blog.eysnter.cn' http://127.0.0.1/
