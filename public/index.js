require('dotenv').config();

const queueRoute=require('./routes/queue');
const app=express();
app.use(cors());
app.use(express.urlencoded({extended:true}));
app.use(express.json());
app.use('',queueRoute);

module.exports =app;