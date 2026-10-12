fetch('http://localhost:3000/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: 'email=rohanpersonal12@gmail.com&password=password'
})
.then(res => {
  console.log('Status:', res.status);
  return res.text();
})
.then(text => console.log(text.substring(0, 500)))
.catch(err => console.error(err));
