
const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const nodemailer = require('nodemailer');
const bodyparser=require('body-parser');
const app = express();
app.use(express.json());
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({extended:true}));


app.get('/',function(req,res){
  res.sendFile(__dirname+'/index.html');
});

const sequelize = new Sequelize('testing', 'root', '123456', {
  host: 'localhost',
  dialect: 'mysql'
});

const Customer = sequelize.define('Customer', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  mobileNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  queueNumber: {
    type: DataTypes.STRING,
    allowNull: false
  },
  serviceType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  waitingTime: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
});
Customer.sync();
async function generateQueueNumber(name, email, mobileNumber, serviceType) {
  try {
   
    const existingCustomer = await Customer.findOne({ where: { email } });
    if (existingCustomer) {
      throw new Error('Email address is already registered.');
    }
    const queueLength = await Customer.count({ where: { email } });
    const timestamp = new Date().getTime();
    const randomNum = Math.floor(Math.random()*100) + 1;
    const uniqueIdentifier = `${timestamp}${randomNum}`;

   
    const queueNumber = `${serviceType === 'Service A' ? 'A' : 'B'}2Z${uniqueIdentifier}`;

    let waitingTime = 0;
    if (serviceType === 'Service A') {
      waitingTime = queueLength * 20; 
    } else if (serviceType === 'Service B') {
      waitingTime = queueLength * 10;
    }


    const customer = await Customer.create({
      name,
      email,
      mobileNumber,
      queueNumber,
      serviceType,
      waitingTime
    });
   
    console.log(`Queue number ${queueNumber} generated for service type ${serviceType}`);

    return customer;
  } catch (error) {
    console.error('Error generating queue number:', error);
    throw new Error('An error occurred while generating the queue number.');
  }
}


async function sendEmailToCustomer(customer) {
  try {
    const { email, name, queueNumber, waitingTime } = customer;

   
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: 'queue260@gmail.com', 
        password:'kilqqjvgpbngbjeb'
      }
    });

    const mailOptions = {
      from:'queue260@gmail.com',
      to: email,
      subject: 'Queue Details',
      text: `Hello ${name},\n\nYour queue number is ${queueNumber} and the estimated waiting time is ${waitingTime} minutes.\n\nThank you!`
    };
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${email}`);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('An error occurred while sending the email.');
  }
}


app.post('/queue', async (req, res) => {
  try {
    const { name, email, mobileNumber, serviceType } = req.body;

    const customer = await generateQueueNumber(name, email, mobileNumber, serviceType);

    res.status(200).json({message:"You Have Successfully Registered for the Queue",customer});
  } catch (error) {
    console.error('Error generating queue number:', error); 
    statusCode = 400;
    errorMessage = 'Email address is already registered.';
  res.status(statusCode).json({errorMessage});
  }
});
app.get('/queue-status', async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      throw new Error('Email is required.');
    }

    const customer = await Customer.findOne({ where: { email } });

    if (!customer) {
      throw new Error('Customer not found.');
    }

    res.status(200).json(customer);
  } catch (error) {
    console.error('Error retrieving customer details:', error);
    res.status(404).json({ error: 'Customer not found' });
  }
});


app.post('/admin/next', async (req, res) => {
  try {
    
    const nextCustomer = await Customer.findOne({
      order: [['queueNumber', 'ASC']]
    });
    if (!nextCustomer) {
      throw new Error('No customers in the queue.');
    }

    await Customer.update(
      {
        waitingTime: sequelize.literal(`CASE
          WHEN serviceType = 'Service A' THEN GREATEST(waitingTime - 20, 0)
          WHEN serviceType = 'Service B' THEN GREATEST(waitingTime - 10, 0)
          ELSE waitingTime
        END`)
      },
      {
        where: {
          id: { [Sequelize.Op.ne]: nextCustomer.id }
        }
      }
    );
    await nextCustomer.destroy();
    const customers = await Customer.findAll({
      where: {
        waitingTime
      }
    });

    if (!customers || customers.length === 0) {
      console.log('No customers in the queue.');
      return;
    }

    for (let customer of customers) {
      await sendEmailToCustomer(customer);
    }

    res.status(400).json({ message: 'Error' });
  } catch(error) {
  let errorMessage = 'Next customer processed successfully.';
  res.status(200).json({ Message: errorMessage });
};
});

const WAITING_TIME_REDUCTION_PRICE = 10; // Price in rupees

app.post('/premium', async (req, res) => {
  try {
    const { email, waitingTimeReduction } = req.body;

    // Find the customer requesting premium service
    const customer = await Customer.findOne({ where: { email } });
    if (!customer) {
      throw new Error('Customer not found.');
    }

    const price = waitingTimeReduction * WAITING_TIME_REDUCTION_PRICE;

    // Calculate the new waiting times
    const customers = await Customer.findAll({
      where: {
        serviceType: customer.serviceType,
        waitingTime: { [Sequelize.Op.gt]: 0 }
      }
    });

    const newWaitingTime = Math.max(customer.waitingTime - waitingTimeReduction, 0);
    await customer.update({ waitingTime: newWaitingTime });

    // Update the waiting time for the customer and others of the same service type
    await sequelize.transaction(async (transaction) => {
      await Customer.update(
        { waitingTime: sequelize.literal(`CASE
          WHEN id = ${customer.id} THEN GREATEST(${newWaitingTime}, 0)
          WHEN serviceType = '${customer.serviceType}' THEN GREATEST(waitingTime + ${waitingTimeReduction}, 0)
          ELSE waitingTime
        END`) },
        {
          where: {
            id: { [Sequelize.Op.ne]: customer.id }
          },
          transaction
        }
      );
    });

    res.status(200).json({ message: 'Confirmation required', price });
  } catch (error) {
    console.error('Error processing premium request:', error);
    let statusCode = 500;
    let errorMessage = 'An error occurred while processing the premium request.';
    if (error.message === 'Customer not found.') {
      statusCode = 404;
      errorMessage = 'Customer not found.';
    }
    res.status(statusCode).json({ error: errorMessage });
  }
});

//setInterval(checkWaitingTimeAndSendEmails, 60000);

module.exports = app;
