const express = require('express');
const paypal = require('paypal-rest-sdk');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

paypal.configure({
	mode: 'sandbox',
	client_id: process.env.CLIENT_ID,
	client_secret: process.env.SECRET_KEY,
});

const app = express();

app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');

app.get('/', (req, res) => res.render('index'));

app.get('/details/:amount', (req, res) => {
	res.render('details', { id: req.params.amount });
});

app.post('/pay', (req, res) => {
	const create_payment_json = {
		intent: 'sale',
		payer: {
			payment_method: 'paypal',
		},
		redirect_urls: {
			return_url: 'http://localhost:8000/success',
			cancel_url: 'http://localhost:8000/cancel',
		},
		transactions: [
			{
				item_list: {
					items: [
						{
							name: 'item',
							sku: 'item',
							price: '25.00',
							currency: 'USD',
							quantity: 1,
						},
					],
				},
				amount: {
					currency: 'USD',
					total: '25.00',
				},
				description: 'This is the payment description.',
			},
		],
	};

	paypal.payment.create(create_payment_json, function (error, payment) {
		if (error) {
			throw error;
		} else {
			for (let i = 0; i < payment.links.length; i++) {
				if (payment.links[i].rel === 'approval_url') {
					res.redirect(payment.links[i].href);
				}
			}
		}
	});
});

app.get('/success', (req, res) => {
	const payerId = req.query.PayerID;
	const paymentId = req.query.paymentId;

	const execute_payment_json = {
		payer_id: payerId,
		transactions: [
			{
				amount: {
					currency: 'USD',
					total: '25.00',
				},
			},
		],
	};

	paypal.payment.execute(paymentId, execute_payment_json, function (
		error,
		payment
	) {
		if (error) {
			console.log(error.response);
			throw error;
		} else {
			res.render('done');
		}
	});
});

app.get('/cancel', (req, res) => res.send('Cancelled'));

app.post('/charge', async (req, res) => {
	const amount = 1000;

	stripe.customers
		.create({
			email: req.body.stripeEmail,
			source: req.body.stripeToken,
		})
		.then(customer =>
			stripe.charges.create({
				amount,
				description: 'Web Obama Donation',
				currency: 'usd',
				customer: customer.id,
			})
		)
		.then(charge => res.render('done'));
});

const port = process.env.PORT || 8000;

app.listen(port, () => {
	console.log(`App listening on port ${port}`);
});
