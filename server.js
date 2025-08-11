import 'dotenv/config';
import express from 'express';
import { Liquid } from 'liquidjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set } from 'firebase/database';
import { METHODS } from 'http';

const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL, 
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

const firebaseApp = initializeApp(firebaseConfig);

// module.exports = firebaseApp;

const db = getDatabase(firebaseApp);

const app = express();

const engine = new Liquid({
    root: path.resolve(__dirname, 'views'),
    extname: '.liquid'
  });

app.engine('liquid', engine.express());
app.set('views', './views'); 
app.set('view engine', 'liquid'); 

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));


async function fetchDishes() {
  const dishesRef = ref(db, 'products');  // your path
  const snapshot = await get(dishesRef);
  if (snapshot.exists()) {
    const dishes = snapshot.val();
    console.log(dishes);
    return dishes;
  } else {
    console.log('No data available');
    return null;
  }
}

app.get('/', async (req, res) => {
    const dishes = await fetchDishes();
    res.render('home', { dishes });
  });
  
app.get('/about', async (req, res) => {
    // const dishes = await fetchDishes();
    res.render('about', { });
  });
  
app.get('/menu', async (req, res) => {
    const dishes = await fetchDishes();
    res.render('menu', { dishes });
  });

app.get('/contact', async (req, res) => {
    // const dishes = await fetchDishes();
    res.render('contact', {  });
  });

  app.get('/winkelmand', async (req, res) => {
    // const dishes = await fetchDishes();
    try {
      const mandjeRef = ref(db, 'winkelmandje'); 
  
      const snapshot = await get(mandjeRef);

      const mandje = snapshot.exists() ? snapshot.val() : [];

      const mandjeArray = Array.isArray(mandje) ? mandje : Object.values(mandje);

    res.render('winkelmand', {mandje: mandjeArray });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Fout bij ophalen van het mandje' });
  }

  });

  app.get('/api/winkelmand/toevoegen', async (req, res) => {
    // const dishes = await fetchDishes();  
    try {
    const mandjeRef = ref(db, 'winkelmandje'); 

    const snapshot = await get(mandjeRef);
    const mandje = snapshot.exists() ? snapshot.val() : [];
    
    res.json({ mandje });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Fout bij ophalen van het mandje' });
  }


  });

  app.post('/api/winkelmand', async (req, res) => {
    const name = req.body.name;

    if (!name) {
        return res.status(400).json({ error: 'Naam van het gerecht is verplicht' });
      }

      try {
        const mandjeRef = ref(db, 'winkelmandje');
        const snapshot = await get(mandjeRef);
        const mandje = snapshot.exists() ? snapshot.val() : [];
   
        mandje.push({ name }); 

        
    await set(mandjeRef, mandje)

    // const dishes = await fetchDishes();
} catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Fout bij toevoegen aan mandje' });
  }
  res.redirect('/menu');
  });


app.set('port', process.env.PORT || 8025)

// Start Express op, haal daarbij het zojuist ingestelde poortnummer op
app.listen(app.get('port'), function () {
  // Toon een bericht in de console en geef het poortnummer door
  console.log(`Application started on http://localhost:${app.get('port')}`)
})
