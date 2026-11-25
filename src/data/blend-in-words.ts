// Secret words for Blend In, by category. Each entry is [word, cousin]: in Classic everyone but the
// outsider sees the word; in Undercover the outsider unknowingly gets the cousin instead, so the two
// should be close enough to confuse. Add, remove or swap pairs freely.

export const CATEGORIES = ['places', 'food', 'animals', 'jobs', 'screen', 'things', 'silly'] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  places: 'Places',
  food: 'Food and drink',
  animals: 'Animals',
  jobs: 'Jobs',
  screen: 'Films and TV',
  things: 'Everyday things',
  silly: 'Silly',
};

// Kept compact on purpose: one pair per line would make this hard to scan.
// prettier-ignore
export const words: Record<Category, [string, string][]> = {
  places: [
    ['Beach', 'Swimming pool'], ['Airport', 'Train station'], ['Hospital', "Dentist's"], ['Library', 'Bookshop'],
    ['Cinema', 'Theatre'], ['Zoo', 'Farm'], ['Gym', 'Spa'], ['Supermarket', 'Corner shop'], ['Prison', 'Police station'],
    ['Castle', 'Palace'], ['Nightclub', 'Pub'], ['Casino', 'Arcade'], ['Campsite', 'Caravan park'],
    ['Ski slope', 'Ice rink'], ['Desert island', 'Rainforest'], ['Space station', 'Submarine'],
    ['Haunted house', 'Graveyard'], ["Hairdresser's", "Barber's"], ['School', 'University'],
    ['Car wash', 'Petrol station'], ['Bowling alley', 'Crazy golf'], ['Lighthouse', 'Pier'], ['Theme park', 'Circus'],
    ['Igloo', 'Treehouse'], ['Launderette', "Dry cleaner's"], ['Office', 'Call centre'], ['Restaurant', 'Café'],
    ['Museum', 'Art gallery'], ['Volcano', 'Mountain'], ['Wedding reception', 'Office party'],
  ],
  food: [
    ['Pizza', 'Burger'], ['Sushi', 'Fish and chips'], ['Spaghetti', 'Lasagne'], ['Doughnut', 'Bagel'], ['Coffee', 'Tea'],
    ['Whisky', 'Wine'], ['Popcorn', 'Crisps'], ['Pancakes', 'Waffles'], ['Ice cream', 'Frozen yoghurt'],
    ['Curry', 'Chilli con carne'], ['Haggis', 'Black pudding'], ['Irn-Bru', 'Cola'], ['Porridge', 'Cornflakes'],
    ['Toast', 'Crumpet'], ['Cheese', 'Butter'], ['Avocado', 'Cucumber'], ['Banana', 'Mango'], ['Chocolate', 'Fudge'],
    ['Birthday cake', 'Wedding cake'], ['Hot dog', 'Sausage roll'], ['Tacos', 'Burritos'], ['Pot Noodle', 'Ramen'],
    ['Garlic bread', 'Cheese on toast'], ['Gin and tonic', 'Mojito'], ['Smoothie', 'Milkshake'],
    ['Brussels sprouts', 'Broccoli'], ['Bacon roll', 'Fry-up'], ['Marmite', 'Peanut butter'], ['Jelly', 'Custard'],
    ['Deep-fried Mars bar', 'Battered sausage'],
  ],
  animals: [
    ['Cat', 'Dog'], ['Lion', 'Tiger'], ['Shark', 'Dolphin'], ['Penguin', 'Puffin'], ['Horse', 'Donkey'], ['Frog', 'Toad'],
    ['Bee', 'Wasp'], ['Crocodile', 'Alligator'], ['Owl', 'Eagle'], ['Rabbit', 'Hamster'], ['Spider', 'Scorpion'],
    ['Cow', 'Sheep'], ['Giraffe', 'Zebra'], ['Snail', 'Slug'], ['Octopus', 'Squid'], ['Bat', 'Moth'],
    ['Pigeon', 'Seagull'], ['Monkey', 'Gorilla'], ['Elephant', 'Rhino'], ['Hedgehog', 'Porcupine'], ['Llama', 'Alpaca'],
    ['Goldfish', 'Tortoise'], ['Mosquito', 'Midge'], ['Kangaroo', 'Wallaby'], ['Flamingo', 'Peacock'],
    ['Sloth', 'Koala'], ['Bear', 'Wolf'], ['Unicorn', 'Dragon'], ['Jellyfish', 'Starfish'], ['Highland cow', 'Yak'],
  ],
  jobs: [
    ['Doctor', 'Nurse'], ['Teacher', 'Driving instructor'], ['Firefighter', 'Paramedic'], ['Chef', 'Waiter'],
    ['Pilot', 'Astronaut'], ['Plumber', 'Electrician'], ['Footballer', 'Referee'], ['Police officer', 'Security guard'],
    ['Hairdresser', 'Make-up artist'], ['Lawyer', 'Judge'], ['Dentist', 'Vet'], ['Farmer', 'Gardener'],
    ['Postal worker', 'Delivery driver'], ['Magician', 'Clown'], ['DJ', 'Bartender'], ['Photographer', 'Influencer'],
    ['Builder', 'Architect'], ['Pirate', 'Sailor'], ['Spy', 'Detective'], ['Lifeguard', 'Swimming coach'],
    ['Bin collector', 'Street sweeper'], ['Actor', 'Stunt double'], ['Accountant', 'Banker'],
    ['Personal trainer', 'Yoga teacher'], ['Tattoo artist', 'Graffiti artist'], ['Taxi driver', 'Bus driver'],
    ['Librarian', 'Museum guide'], ['Butcher', 'Fishmonger'], ['Undertaker', 'Gravedigger'],
    ['Wedding planner', "Children's entertainer"],
  ],
  screen: [
    ['Titanic', 'Jaws'], ['Star Wars', 'Star Trek'], ['Harry Potter', 'The Lord of the Rings'], ['Frozen', 'Moana'],
    ['Shrek', 'Toy Story'], ['The Lion King', 'Finding Nemo'], ['Jurassic Park', 'King Kong'],
    ['James Bond', 'Mission: Impossible'], ['Friends', 'The Office'], ['The Simpsons', 'Family Guy'],
    ['Love Island', 'Big Brother'], ['Strictly Come Dancing', 'The Great British Bake Off'],
    ['Game of Thrones', 'House of the Dragon'], ['Breaking Bad', 'Narcos'], ['Doctor Who', 'Sherlock'],
    ['Home Alone', 'Elf'], ['Rocky', 'The Karate Kid'], ['Grease', 'Mamma Mia!'], ['Ghostbusters', 'Men in Black'],
    ['Batman', 'Superman'], ['Squid Game', 'The Hunger Games'], ['Peppa Pig', 'Bluey'], ['Mr Bean', 'Fawlty Towers'],
    ['Top Gun', 'Fast & Furious'], ['Barbie', 'Oppenheimer'], ['The Matrix', 'Inception'], ['Mean Girls', 'Clueless'],
    ['Pirates of the Caribbean', 'Indiana Jones'], ['Still Game', 'Two Doors Down'], ['Gogglebox', 'Come Dine with Me'],
  ],
  things: [
    ['Toothbrush', 'Hairbrush'], ['Umbrella', 'Raincoat'], ['Phone', 'Tablet'], ['Kettle', 'Toaster'], ['Sofa', 'Bed'],
    ['Socks', 'Slippers'], ['Wallet', 'Handbag'], ['Keys', 'Padlock'], ['Fridge', 'Freezer'], ['Mirror', 'Window'],
    ['Pillow', 'Duvet'], ['Candle', 'Torch'], ['Laptop', 'Games console'], ['Shower', 'Bath'], ['Sunglasses', 'Hat'],
    ['Backpack', 'Suitcase'], ['Scissors', 'Knife'], ['Washing machine', 'Dishwasher'], ['Clock', 'Calendar'],
    ['Hoover', 'Mop'], ['Headphones', 'Speaker'], ['Lightbulb', 'Lamp'], ['Paperclip', 'Stapler'], ['Plant pot', 'Vase'],
    ['Tea towel', 'Bath towel'], ['Alarm clock', 'Smoke alarm'], ['Selfie stick', 'Tripod'],
    ['Lunchbox', 'Picnic basket'], ['Hairdryer', 'Hair straighteners'], ['TV remote', 'Doorbell'],
  ],
  silly: [
    ['Whoopee cushion', 'Rubber chicken'], ['Mullet', 'Comb-over'], ['Dad dancing', 'Air guitar'], ['Onesie', 'Pyjamas'],
    ['Garden gnome', 'Flamingo ornament'], ['Bouncy castle', 'Ball pit'], ['Karaoke', 'Busking'],
    ['Hangover', 'Food coma'], ['Wedgie', 'Noogie'], ['Belly flop', 'Cannonball'], ['Mankini', 'Speedos'],
    ['Hen do', 'Stag do'], ['Awkward silence', 'Long goodbye'], ['Group chat', 'Voice note'],
    ['Snoring', 'Sleepwalking'], ['Brain freeze', 'Hiccups'], ['Photobomb', 'Selfie'], ['Pub quiz', 'Bingo night'],
    ['Chippy tea', 'Kebab at 3am'], ['Crocs', 'Socks and sandals'], ['First date', 'Blind date'],
    ['Lost luggage', 'Missed flight'], ['Fake tan', 'Sunburn'], ['Bad haircut', 'Bad tattoo'],
    ['Parking ticket', 'Speeding fine'], ['Inflatable flamingo', 'Pool noodle'], ['Escape room', 'Murder mystery'],
    ['Self-checkout', 'Queue'], ['The worm', 'The robot'], ['Fancy dress', 'Ugly Christmas jumper'],
  ],
};
