let express = require('express');
let bodyParser = require('body-parser');
let request = require('superagent');
let app = express();
let querystring = require('querystring');
let mailchimpClientId = '640469038632';
let mailchimpSecretKey = 'a43d97ae304380ef3a51b8ff643d91735dce811f5db784146e';
let dataStore = require('./dataStore.js');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static('views'));



let mailchimpInstance   = 'us14',
    listUniqueId        = '6f785094ca',
    mailchimpApiKey     = '8230108eca333612a57168c0ac6b40bc-us14';

app.post('/signup', function (req, res) {
  request
  .post('https://' + mailchimpInstance + '.api.mailchimp.com/3.0/lists/' + listUniqueId + '/members/')
  .set('Content-Type', 'application/json;charset=utf-8')
  .set('Authorization', 'Basic ' + new Buffer('any:' + mailchimpApiKey ).toString('base64'))
  .send({
    'email_address': req.body.email,
    'status': 'subscribed',
    'merge_fields': {
      'FNAME': req.body.firstname,
      'LNAME': req.body.lastname
    }
  })
      .end(function(err, response) {
        if (response.status < 300 || (response.status === 400 && response.body.title === "Member Exists")) {
          res.send('Sign Up Successfully');
        } else {
          res.send('Sign Up Failed');
        }
    });
  });



app.get('/mailchimp/auth/authorize', function(req, res) {
  res.redirect('https://login.mailchimp.com/oauth2/authorize?' +
            querystring.stringify({
                'response_type': 'code',
                'client_id': mailchimpClientId,
                'redirect_uri': 'http://127.0.0.1:3000/mailchimp/auth/callback'
            }));
});

app.get('/mailchimp/auth/callback', function(req, res) {
  request.post('https://login.mailchimp.com/oauth2/token')
         .send(querystring.stringify({
            'grant_type': 'authorization_code',
            'client_id': mailchimpClientId,
            'client_secret': mailchimpSecretKey,
            'redirect_uri': 'http://127.0.0.1:3000/mailchimp/auth/callback',
            'code': req.query.code
          }))
            .end((err, result) => {
                if (err) {
                    res.send('An unexpected error occured while trying to perform MailChimp oAuth');
                } else {
                  // we need to get the metadata for the user
                  request.get('https://login.mailchimp.com/oauth2/metadata')
                    .set('Accept', 'application/json')
                    .set('Authorization', 'OAuth ' + result.body.access_token)
                        .end((err, metaResult) => {
                            if (err) {
                                res.send('An unexpected error occured while trying to get MailChimp meta oAuth');
                            } else {
                                // save the result.body.access_token
                                // save the metadata in metaResult.body
                                // against the current user
                                let mailchimpConf = metaResult;
                                mailchimpConf.access_token = result.body.access_token;
                                dataStore.saveMailChimpForUser(mailchimpConf.login.email, metaResult);
                                res.redirect('/pick-a-list.html?email=' + mailchimpConf.login.email)
                            }
                        });
                }
            });
});

app.get('/mailchimp/lists', function(req, res) {
  let mailchimpConf = dataStore.getMailChimpForUser(req.query.email);
  request.get(mailchimpConf.api_endpoint + '/3.0/lists')
                .set('Accept', 'application/json')
                .set('Authorization', 'OAuth ' + mailchimpConf.access_token)
                    .end((err, result) => {
                        if (err) {
                            res.status(500).json(err);
                        } else {
                            res.json(result.body.lists);
                        }
                    });
});

app.get('/mailchimp/list/members/:id', function(req, res) {
  let mailchimpConf = dataStore.getMailChimpForUser(req.query.email);
  request.get(mailchimpConf.api_endpoint + '/3.0/lists/' + req.params.id + '/members')
                .set('Accept', 'application/json')
                .set('Authorization', 'OAuth ' + mailchimpConf.access_token)
                    .end((err, result) => {
                        if (err) {
                            res.status(500).json(err);
                        } else {
                            res.json(result.body.members);
                        }
                    });
});

app.listen(3000, function () {
  console.log('Example app listening on port 3000!');
});