require('dotenv').config();
const http=require('http');
const app=require('./routes/queue');
const server=http.createServer(app);
server.listen(process.env.PORT);