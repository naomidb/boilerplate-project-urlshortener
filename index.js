require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();

const dns = require('dns');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));
app.use(bodyParser.urlencoded({extended: false}));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Add db schema
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
const Schema = mongoose.Schema;

const urlSchema = new Schema({
  original_url: { type: String, required: true }
});

let Link;

Link = mongoose.model("Link", urlSchema);

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

// Create shorturl id
app.post('/api/shorturl', function(req, res){
  // Validate original url
  // dns is extremely finicky
  var url_input = req.body.url;

  if (url_input.startsWith('https://')) {
    url_input = url_input.substring(8);
  }
  if (url_input.startsWith('http://')) {
    url_input = url_input.substring(7);
  }
  if (url_input.endsWith('/')) {
    url_input = url_input.substring(0, url_input.length-1);
  }

  var newURL = new Link( {"original_url": req.body.url });

  // localhost won't pass a dns check
  if (url_input.startsWith('localhost')) {
    newURL.save(function(err, data) {
      if (err) return console.log(err);
      res.json({ original_url: req.body.url, short_url: newURL.id });
    });
  } else {
    dns.lookup(url_input, (err) => {
      if (err) { res.json({ 'error': 'invalid url' }) }
      else {
        newURL.save(function(err, data) {
        if (err) return console.log(err);
        res.json({ original_url: req.body.url, short_url: newURL.id });
        })
      }
    });
  }
});

// Redirect to original url
app.get('/api/shorturl/:short_url', async function(req, res){
  if (req.params.short_url) {
    try {
      const url = await Link.findById(req.params.short_url);
      if (url) { return res.redirect(url.original_url) }
      else {
        // If short url is invalid, return error
        res.json({ 'error': 'invalid url' });
      }
    } catch (err) {
      res.json({ 'error': 'invalid url' })
    }
  } else {
    res.json({ 'error': 'invalid url' })
  }
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
