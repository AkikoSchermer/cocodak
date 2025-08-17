import 'dotenv/config';
import express from 'express';
import { Liquid } from 'liquidjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, push } from 'firebase/database';
// import { Liquid } from 'liquidjs'; 
// import { METHODS } from 'http';
// import { arrayIncludes } from 'liquidjs/dist/render';


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

// console.log("Database URL:", process.env.FIREBASE_DATABASE_URL);

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

const dishesArray = Object.values(dishes);
const tags = dishesArray.map(dish => dish.tags);

const uniqueTags = [...new Set(tags.flat())];

// maak een lege array aan voor de tags
// const allTags = [];

// dishesArray.forEach(dish => {
//   if (dish.tags) {
//     dish.tags.forEach(tag =>{
//     allTags.push(tag);
//   });
// }
// });



// console.log(allTags);

return { dishes, tags: uniqueTags };
} else {
  console.log('No data available');
  return null;
}
}

fetchDishes();



app.get('/', async (req, res) => {
    const dishes = await fetchDishes();
    res.render('home', { dishes });
  });

  app.get('/home', async (req, res) => {
    const dishes = await fetchDishes();
    res.render('home', { dishes });
  });
  
app.get('/about', async (req, res) => {
    // const dishes = await fetchDishes();
    res.render('about', { });
  });
  
  app.get('/menu', async (req, res) => {
    try {
      const nameFilter = req.query.name;
      const data = await fetchDishes(); // noem het even data
      const dishesArray = data && data.dishes ? Object.values(data.dishes) : [];

      const selectedNames = [
        "Bibimbab Vegetarian",
        "Dak Gomtang",
        "Korean Fried Chicken - Sweet & Sour Chili (5pcs)",
        "Japchae Chicken"
      ]

      const selectedDishes = dishesArray.filter(dish => selectedNames.includes(dish.name));

  
      res.render('menu', { dishes: selectedDishes });
    } catch (error) {
      console.error(error);
      res.status(500).send('Serverfout bij ophalen gerechten');
    }
  });
  

app.get('/contact', async (req, res) => {
    // const dishes = await fetchDishes();
    res.render('contact', {  });
  });

  app.get('/order', async (req, res) => {
    const urlTags = req.query.tag;
    const data = await fetchDishes();

    if (data) {
      let filteredDishes = Object.values (data.dishes);
    
    
     if (urlTags) {
      filteredDishes = filteredDishes.filter(dish => dish.tags && dish.tags.includes(urlTags));
     }
    
    res.render('order', { dishes: filteredDishes, tags: data.tags, urlTags });
    } else {
      res.render('order', { dishes: [], tags: [], urlTags: null  });
    }
  });

  app.get('/winkelmand', async (req, res) => {
    // const dishes = await fetchDishes();
    try {
      // data ophalen
      const mandjeRef = ref(db, 'winkelmandje'); 
      const snapshot = await get(mandjeRef);
      // const mandje = snapshot.exists() ? snapshot.val() : [];
      const mandjeData = snapshot.exists() ? snapshot.val() : { items: [], note: '' };
    
      // const mandjeArray = Array.isArray(mandje) ? mandje : Object.values(mandje);
      
      const mandjeArray = Array.isArray(mandjeData.items) ? mandjeData.items : [];
      const orderNote = mandjeData.note || '';

      
      const itemCount = mandjeArray.reduce((total, item) => total + (item.quantity || 1), 0);

    res.render('winkelmand', {mandje: mandjeArray, orderNote,itemCount });

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
  
  app.get('/bestelling-is-geslaagd', (req, res) => {
    res.render('bestelling-geslaagd'); 
  });

app.post('/api/winkelmand/order-note' , async (req, res) => {
  try {
    let { orderNote } = req.body;
    if (!orderNote) orderNote = '';

    const mandjeRef = ref(db, 'winkelmandje'); 
    const snapshot = await get(mandjeRef);
    const mandjeData = snapshot.exists() ? snapshot.val() : { items: [] };

    // const items = Array.isArray(mandjeData) ? mandjeData : mandjeData.items || [];
    const items = Array.isArray(mandjeData.items)
    ? mandjeData.items
    : (mandjeData.items ? Object.values(mandjeData.items) : []);


    const newMandje = {
      items,
      note: orderNote
    };

    // mandje.note = orderNote

    await set(mandjeRef, newMandje);
    res.redirect('/winkelmand');
  } catch (error) {
    console.error(error);
    res.status(500).send('Fout bij opslaan van de opmerking');
  }

  });

  app.post('/api/winkelmand/place-order', async (req, res) => {
    try {
      const orderNote = req.body.orderNote || '';

      const mandjeRef = ref(db, 'winkelmandje');
      const snapshot = await get(mandjeRef);
      // const mandje = snapshot.exists() ? snapshot.val() : [];
      const mandjeData = snapshot.exists()
      ? snapshot.val()
      : { items: [], note: '' };

      const items = Array.isArray(mandjeData.items) ? mandjeData.items : [];

      if (items.length === 0) {
        return res.redirect('/winkelmand');
      }

        const ordersRef = ref(db, 'orders');
        const nieuweBestelling = {
          items,
          note: orderNote || mandjeData.note || '',
          status: 'Wordt bereid',
          geplaatstOp: new Date().toISOString()
        };


        await push(ordersRef, nieuweBestelling);

        await set(mandjeRef, { items: [], note: '' });


      res.redirect('/bestelling-is-geslaagd');
    } catch (error) {
      console.error(error);
      res.status(500).send('Fouut');
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

        const mandjeData = snapshot.exists() ? snapshot.val() : { items: [], note: '' };

        const items = Array.isArray(mandjeData.items) ? mandjeData.items : [];

        const existingItem = items.find(item => item.name === name);
        if (existingItem) {
          existingItem.quantity += 1;
        } else {
        items.push({ name, quantity: 1  });
      }

        const newMandje = {
          items,
          note: mandjeData.note || ''
        };

        
    await set(mandjeRef, newMandje)

    // const dishes = await fetchDishes();
} catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Fout bij toevoegen aan mandje' });
  }
  res.redirect('/order');
  });

  app.use((req, res) => {
    res.status(404).send('404 - Pagina niet gevonden');
  });
  


app.set('port', process.env.PORT || 8025)
// const port = app.get('port');
// app.listen(port, () => {
//   console.log(`Server running on port ${port}`);
// });

// Start Express op, haal daarbij het zojuist ingestelde poortnummer op
app.listen(app.get('port'), function () {
  // Toon een bericht in de console en geef het poortnummer door
  console.log(`Application started on http://localhost:${app.get('port')}`)
})
