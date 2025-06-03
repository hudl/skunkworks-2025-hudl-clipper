#!/bin/bash

YELLOW="\e[33m"
ENDCOLOR="\e[0m"

rm -rf dist

mkdir -p dist

dist_dir=$(pwd)/dist/
MANIFEST_FILE=manifest.json

npm run build
# copy all static files
cp -R static/. $dist_dir

# generating manifest file
touch $dist_dir/$MANIFEST_FILE
