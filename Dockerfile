# Jekyll-based local preview server for this GitHub Pages site.
# Build:  docker build -t 23skdu-jekyll .
# Run:    docker run --rm -p 4000:4000 -v "$PWD:/srv/jekyll" 23skdu-jekyll
FROM ruby:3.3-alpine

RUN apk add --no-cache build-base git

# Jekyll + Bundler for local authoring/preview.
RUN gem install jekyll bundler --no-document

WORKDIR /srv/jekyll

# Jekyll's default serve port.
ENV JEKYLL_PORT=4000
EXPOSE 4000

# --livereload lets edits show up without a manual refresh.
CMD ["sh", "-c", "jekyll serve --host 0.0.0.0 --port ${JEKYLL_PORT} --livereload"]
