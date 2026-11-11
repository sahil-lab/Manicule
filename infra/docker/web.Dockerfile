FROM nginxinc/nginx-unprivileged:stable-alpine
COPY infra/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY infra/docker/errors.conf /etc/nginx/manicule-errors.conf
COPY apps/web/dist /usr/share/nginx/html
EXPOSE 8080 8081
