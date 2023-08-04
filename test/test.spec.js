const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../routes/queue'); 

chai.use(chaiHttp);
const expect = chai.expect;

describe('API Testing', () => {
  describe('GET /', () => {
    it('should return index.html', (done) => {
      chai
        .request(app)
        .get('/')
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res).to.be.html;
          done();
        });
    });
  });
describe('POST /queue', () => {
    it('should register a customer and generate a queue number', (done) => {
      chai
        .request(app)
        .post('/queue')
        .send({
          name: 'customer1',
          email: 'customer3@example.com',
          mobileNumber: '1234567890',
          serviceType: 'Service A'
        })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('message').equal('You Have Successfully Registered for the Queue');
          expect(res.body.customer).to.have.property('id');
          expect(res.body.customer).to.have.property('name').equal('customer1');
          expect(res.body.customer).to.have.property('email').equal('customer3@example.com');
          expect(res.body.customer).to.have.property('queueNumber');
          expect(res.body.customer).to.have.property('serviceType').equal('Service A');
          expect(res.body.customer).to.have.property('waitingTime');
          done();
        });
    });
  });

  describe('-----GET /queue-status------', () => {
    it('should return customer details based on email', (done) => {
      chai
        .request(app)
        .get('/queue-status')
        .query({ email: 'customer3@example.com' })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('id');
          expect(res.body).to.have.property('name').equal('customer1');
          expect(res.body).to.have.property('email').equal('customer3@example.com');
          expect(res.body).to.have.property('queueNumber');
          expect(res.body).to.have.property('serviceType');
          expect(res.body).to.have.property('waitingTime');
          done();
        });
    });
  });
  describe('-----POST /admin/next-----', () => {
    it('should process the next customer and send an email', (done) => {
      chai
        .request(app)
        .post('/admin/next')
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('Message').equal('Next customer processed successfully.');
          done();
        });
    });
  });
describe('POST /premium', () => {
    it('should process premium request and return confirmation details', (done) => {
      chai
        .request(app)
        .post('/premium')
        .send({
          email: 'customer3@example.com',
          waitingTimeReduction: 5
        })
        .end((err, res) => {
          expect(res).to.have.status(200);
          expect(res.body).to.have.property('message').equal('Confirmation required');
          expect(res.body).to.have.property('price');
          done();
        });
    });
  });
});
