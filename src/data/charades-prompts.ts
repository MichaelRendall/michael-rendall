// Prompts for Charades, by category and difficulty. Add, remove or move prompts freely: the game
// shuffles whatever is here and won't repeat one until every prompt for the chosen settings is used.
// Aimed at adults, but nothing explicit.

export const CATEGORIES = ['films', 'tv', 'books', 'animals', 'actions', 'jobs', 'objects', 'people'] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  films: 'Films',
  tv: 'TV',
  books: 'Books',
  animals: 'Animals',
  actions: 'Actions',
  jobs: 'Jobs',
  objects: 'Objects',
  people: 'Famous people',
};

export const LEVELS = ['easy', 'medium', 'hard'] as const;
export type Level = (typeof LEVELS)[number];

// Kept compact on purpose: one prompt per line would make this hard to scan.
// prettier-ignore
export const prompts: Record<Category, Record<Level, string[]>> = {
  films: {
    easy: [
      'Titanic', 'Jaws', 'Frozen', 'Toy Story', 'Star Wars', 'Jurassic Park', 'The Lion King', 'Shrek',
      'Finding Nemo', 'Home Alone', 'Ghostbusters', 'Rocky', 'Mary Poppins', 'Grease', 'Mamma Mia!',
      'King Kong', 'E.T.',
    ],
    medium: [
      'The Matrix', 'Back to the Future', 'The Wizard of Oz', 'Jumanji', 'Ratatouille', 'Top Gun', 'The Exorcist',
      'Psycho', 'Gladiator', 'Inception', 'Up', 'Dirty Dancing', 'The Hangover', 'Mean Girls', 'Pulp Fiction',
      'Forrest Gump', 'The Shining',
    ],
    hard: [
      'The Silence of the Lambs', 'Eternal Sunshine of the Spotless Mind', 'Groundhog Day', 'Lost in Translation',
      'The Wolf of Wall Street', 'Fight Club', 'Trainspotting', 'Brokeback Mountain', 'The Usual Suspects',
      "One Flew Over the Cuckoo's Nest", 'Fifty Shades of Grey', 'Saw', 'Apocalypse Now', 'The Grand Budapest Hotel',
      'Get Out', 'Parasite', 'Everything Everywhere All at Once',
    ],
  },
  tv: {
    easy: [
      'Friends', 'The Simpsons', 'Doctor Who', 'SpongeBob SquarePants', 'Strictly Come Dancing',
      'The Great British Bake Off', 'Peppa Pig', 'Mr Bean', 'Game of Thrones', 'Stranger Things', 'The Office',
      'EastEnders', 'Coronation Street', 'Top Gear', 'Teletubbies', 'Love Island', 'Countdown',
    ],
    medium: [
      'Breaking Bad', 'Squid Game', 'The Crown', 'Peaky Blinders', 'Only Fools and Horses', 'Fawlty Towers',
      'Gavin & Stacey', 'Sherlock', 'Line of Duty', 'The Walking Dead', 'Gogglebox', "Dragons' Den",
      'Married at First Sight', 'The Apprentice', 'Bluey', 'Ted Lasso', 'Downton Abbey',
    ],
    hard: [
      'The Sopranos', 'Fleabag', 'Succession', 'Black Mirror', 'Twin Peaks', 'The Wire', 'Mad Men', 'Severance',
      'Derry Girls', 'Still Game', 'Taskmaster', 'Inside No. 9', 'Big Brother', 'The Thick of It',
      'Absolutely Fabulous', 'Normal People', 'Baby Reindeer',
    ],
  },
  books: {
    easy: [
      'The Very Hungry Caterpillar', 'Alice in Wonderland', 'Winnie-the-Pooh', 'Charlie and the Chocolate Factory',
      'Peter Pan', 'The Gruffalo', 'Cinderella', 'Pinocchio', 'Romeo and Juliet', 'Robin Hood',
      'Goldilocks and the Three Bears', 'Little Red Riding Hood', 'Matilda', 'The Cat in the Hat', 'Treasure Island',
      'Sleeping Beauty', 'Hamlet',
    ],
    medium: [
      'Frankenstein', 'Dracula', 'The Hobbit', 'The Hunger Games', 'Twilight', 'Moby-Dick', 'Pride and Prejudice',
      'Oliver Twist', "Gulliver's Travels", 'The Jungle Book', 'A Christmas Carol', 'Macbeth', 'Black Beauty',
      'The Secret Garden', 'Of Mice and Men', 'Lord of the Flies', 'The Da Vinci Code',
    ],
    hard: [
      'Nineteen Eighty-Four', 'Brave New World', 'The Great Gatsby', 'Wuthering Heights', 'Catch-22',
      'The Catcher in the Rye', 'Don Quixote', 'Crime and Punishment', 'War and Peace', "The Handmaid's Tale",
      'Life of Pi', 'Gone Girl', 'Jane Eyre', 'The Picture of Dorian Gray', "Lady Chatterley's Lover",
      'American Psycho', 'The Metamorphosis',
    ],
  },
  animals: {
    easy: [
      'Dog', 'Cat', 'Elephant', 'Monkey', 'Snake', 'Kangaroo', 'Penguin', 'Lion', 'Rabbit', 'Frog', 'Chicken',
      'Horse', 'Shark', 'Giraffe', 'Cow', 'Duck', 'Spider',
    ],
    medium: [
      'Gorilla', 'Crab', 'Octopus', 'Flamingo', 'Sloth', 'Peacock', 'Squirrel', 'Bat', 'Crocodile', 'Owl',
      'Jellyfish', 'Seal', 'Camel', 'Woodpecker', 'Bee', 'Hedgehog', 'Ostrich',
    ],
    hard: [
      'Platypus', 'Chameleon', 'Armadillo', 'Meerkat', 'Narwhal', 'Praying mantis', 'Anteater', 'Pufferfish',
      'Seahorse', 'Komodo dragon', 'Hermit crab', 'Hummingbird', 'Axolotl', 'Lobster', 'Vulture', 'Starfish',
      'Pelican',
    ],
  },
  actions: {
    easy: [
      'Swimming', 'Brushing your teeth', 'Driving a car', 'Riding a bike', 'Sleeping', 'Dancing', 'Cooking',
      'Playing football', 'Taking a selfie', 'Fishing', 'Skipping', 'Eating spaghetti', 'Crying',
      'Climbing a ladder', 'Blowing up a balloon', 'Washing your hair', 'Playing the guitar',
    ],
    medium: [
      'Riding a rollercoaster', "Walking a dog that won't behave", 'Changing a nappy', 'Ice skating', 'Surfing',
      'Doing the washing-up', 'Building flat-pack furniture', 'Parallel parking', 'Trying on jeans that are too tight',
      'Milking a cow', 'Sneezing', 'Blowing out birthday candles', 'Getting a tattoo', 'Bowling', 'Doing yoga',
      'Hailing a taxi', 'Being stung by a bee',
    ],
    hard: [
      'Waking up with a hangover', 'Doing the walk of shame', 'Getting caught singing in the shower',
      'Stepping on Lego', 'Missing the last train home', 'Being stuck in a lift', 'Proposing and being turned down',
      'Losing your phone', 'Eating a very hot chilli', 'Sitting on a whoopee cushion', 'Walking a tightrope',
      'Doing the Macarena', 'Defusing a bomb', 'Accidentally hitting reply all', 'Sinking in quicksand',
      'Waxing your legs', 'Shaving off a beard',
    ],
  },
  jobs: {
    easy: [
      'Doctor', 'Teacher', 'Firefighter', 'Police officer', 'Chef', 'Pilot', 'Dentist', 'Hairdresser', 'Farmer',
      'Builder', 'Footballer', 'Singer', 'Clown', 'Astronaut', 'Postal worker', 'Magician', 'Nurse',
    ],
    medium: [
      'Lifeguard', 'Plumber', 'Waiter', 'DJ', 'Personal trainer', 'Referee', 'Taxi driver', 'Photographer',
      'Librarian', 'Window cleaner', 'Mime artist', 'Butcher', 'Vet', 'Bin collector', 'Tattoo artist', 'Surgeon',
      'Flight attendant',
    ],
    hard: [
      'Air traffic controller', 'Bomb disposal expert', 'Archaeologist', 'Beekeeper', 'Lion tamer', 'Stunt double',
      'Sommelier', 'Influencer', 'Undertaker', 'Puppeteer', 'Lumberjack', 'Orchestra conductor', 'Auctioneer',
      'Taxidermist', 'Bouncer', 'Hypnotist', 'Snake charmer',
    ],
  },
  objects: {
    easy: [
      'Umbrella', 'Toothbrush', 'Scissors', 'Telephone', 'Bicycle', 'Hairdryer', 'Camera', 'Ball', 'Hammer',
      'Glasses', 'Kettle', 'Book', 'Pillow', 'Balloon', 'Clock', 'Shoe', 'Ice cream',
    ],
    medium: [
      'Vacuum cleaner', 'Trampoline', 'Microwave', 'Lawnmower', 'Hula hoop', 'Stapler', 'Yo-yo', 'Treadmill',
      'Washing machine', 'Selfie stick', 'Toaster', 'Telescope', 'TV remote', 'Sleeping bag', 'Fire extinguisher',
      'Bagpipes', 'Skateboard',
    ],
    hard: [
      'Lava lamp', 'Metronome', 'Corkscrew', 'Pogo stick', 'Kaleidoscope', 'Accordion', 'Sundial', 'Boomerang',
      'Hourglass', 'Sewing machine', 'Typewriter', 'Periscope', 'Bunsen burner', 'Pepper grinder', 'Snow globe',
      'Vending machine', 'Sat nav',
    ],
  },
  // Real and fictional.
  people: {
    easy: [
      'Superman', 'Batman', 'Santa Claus', 'Elvis Presley', 'Mickey Mouse', 'Darth Vader', 'Michael Jackson',
      'Albert Einstein', 'Queen Elizabeth II', 'Charlie Chaplin', 'Tarzan', 'Sherlock Holmes', 'Cristiano Ronaldo',
      'Taylor Swift', 'Usain Bolt', 'Wonder Woman', 'The Tooth Fairy',
    ],
    medium: [
      'Freddie Mercury', 'Marilyn Monroe', 'Napoleon', "Frankenstein's monster", 'Indiana Jones', 'James Bond',
      'Gandalf', 'Willy Wonka', 'Beyoncé', 'Gordon Ramsay', 'Lady Gaga', 'Henry VIII', 'Captain Jack Sparrow',
      'David Attenborough', 'William Shakespeare', 'Cleopatra', 'Elon Musk',
    ],
    hard: [
      'Joan of Arc', 'Vincent van Gogh', 'Salvador Dalí', 'Frida Kahlo', 'Edward Scissorhands', 'Hannibal Lecter',
      'Miss Havisham', 'Gollum', 'Bob Ross', 'Billy Connolly', 'Rab C. Nesbitt', 'Mrs Doubtfire', 'Isaac Newton',
      'Marie Curie', 'Harry Houdini', 'Neil Armstrong', 'Pablo Picasso',
    ],
  },
};
