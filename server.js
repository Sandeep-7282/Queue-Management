require('dotenv').config();
const express =require('express')
const http=require('http');
const app=require('./routes/queue');
const server=http.createServer(app);
server.listen(process.env.PORT);