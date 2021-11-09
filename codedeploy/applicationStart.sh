#!/bin/bash

cd /home/ubuntu/webapp
sudo cp /home/ubuntu/server/config.json cd /home/ubuntu/webapp
sudo nohup node app.js >> debug.log 2>&1 &

