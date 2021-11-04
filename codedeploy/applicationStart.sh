#!/bin/bash

cd /home/ubuntu/webapp
sudo nohup node app.js >> debug.log 2>&1 &