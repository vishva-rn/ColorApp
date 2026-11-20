import type { ImageProps } from 'expo-image';

import type { NumberArt } from './number-art';

type ArtCategory = {
  id: string;
  label: string;
  image: NonNullable<ImageProps['source']>;
  artIds: readonly string[];
};

export const ART_CATEGORIES: readonly ArtCategory[] = [
  { id: 'houses', label: 'Houses', image: require('../assets/images/categories/houses.png'), artIds: ['cottage', 'treehouse'] },
  { id: 'mandalas', label: 'Mandalas', image: require('../assets/images/categories/mandalas.png'), artIds: ['mandala', 'sun_mandala', 'butterfly_mandala'] },
  { id: 'dogs', label: 'Dogs', image: require('../assets/images/categories/dogs.png'), artIds: ['puppy'] },
  { id: 'landscapes', label: 'Landscapes', image: require('../assets/images/categories/landscapes.png'), artIds: ['lake', 'hills', 'beach'] },
  { id: 'cats', label: 'Cats', image: require('../assets/images/categories/cats.png'), artIds: ['cat'] },
  { id: 'zen', label: 'Zen', image: require('../assets/images/categories/zen.png'), artIds: ['lotus', 'lake', 'tea_party'] },
  { id: 'birds', label: 'Birds', image: require('../assets/images/categories/birds.png'), artIds: ['parrot', 'owl', 'penguins', 'hummingbird', 'flamingo', 'peacock'] },
  { id: 'interiors', label: 'Interiors', image: require('../assets/images/categories/interiors.png'), artIds: ['room', 'stairs'] },
  { id: 'fantasy', label: 'Fantasy', image: require('../assets/images/categories/fantasy.png'), artIds: ['unicorn', 'dragon', 'mermaid', 'fairy', 'castle'] },
  { id: 'flowers', label: 'Flowers', image: require('../assets/images/categories/flowers.png'), artIds: ['sunflowers', 'roses', 'tulips', 'lotus', 'butterflies', 'hummingbird', 'woman'] },
  { id: 'patterns', label: 'Patterns', image: require('../assets/images/categories/patterns.png'), artIds: ['peacock', 'mandala', 'sun_mandala', 'butterfly_mandala', 'mosaic_sunrise_glass'] },
  { id: 'wildlife', label: 'Wildlife', image: require('../assets/images/categories/wildlife.png'), artIds: ['fox', 'deer', 'panda', 'elephant', 'giraffe', 'lioncub', 'penguins', 'koala', 'owl'] },
  { id: 'farms', label: 'Farms', image: require('../assets/images/categories/farms.png'), artIds: ['farm', 'hills'] },
  { id: 'people', label: 'People', image: require('../assets/images/categories/people.png'), artIds: ['woman', 'family_picnic_garden', 'sunny_market_stall'] },
  { id: 'marine', label: 'Marine', image: require('../assets/images/categories/marine.png'), artIds: ['dolphin', 'turtle', 'mermaid', 'sailboat'] },
  { id: 'butterflies', label: 'Butterflies', image: require('../assets/images/categories/butterflies.png'), artIds: ['butterflies', 'butterfly_mandala'] },
  { id: 'gardens', label: 'Gardens', image: require('../assets/images/categories/gardens.png'), artIds: ['tulips', 'bunny', 'cottage', 'butterflies', 'fairy', 'lotus'] },
  { id: 'dragons', label: 'Dragons', image: require('../assets/images/categories/dragons.png'), artIds: ['dragon'] },
  { id: 'fashion', label: 'Fashion', image: require('../assets/images/categories/fashion-illustrated.png'), artIds: ['coral_runway_gown', 'woman'] },
  { id: 'food', label: 'Food', image: require('../assets/images/categories/food.png'), artIds: ['cupcakes', 'fruit', 'icecream', 'donuts', 'tea_party', 'sushi', 'kawaii_cake'] },
  { id: 'classy', label: 'Classy', image: require('../assets/images/categories/classy-illustrated.png'), artIds: ['evening_pearls_vanity', 'stairs', 'tea_party'] },
  { id: 'love', label: 'Love', image: require('../assets/images/categories/love-illustrated.png'), artIds: ['love_letters_bouquet', 'roses'] },
  { id: 'mosaic', label: 'Mosaic', image: require('../assets/images/categories/mosaic-illustrated.png'), artIds: ['mosaic_sunrise_glass'] },
  { id: 'messages', label: 'Messages', image: require('../assets/images/categories/messages-illustrated.png'), artIds: ['hello_sunshine_postcard'] },
  { id: 'stylized', label: 'Stylized', image: require('../assets/images/categories/stylized.png'), artIds: ['sun_mandala', 'cosmic_comic_rocket', 'kawaii_sky', 'peacock'] },
  { id: 'cars', label: 'Cars', image: require('../assets/images/categories/cars.png'), artIds: ['vintage_car'] },
  { id: 'art', label: 'Art', image: require('../assets/images/categories/art-illustrated.png'), artIds: ['studio_still_life_bouquet', 'fruit', 'sunflowers'] },
  { id: 'landmarks', label: 'Landmarks', image: require('../assets/images/categories/landmarks.png'), artIds: ['paris', 'sakura_temple', 'castle'] },
  { id: 'kids', label: 'Kids', image: require('../assets/images/categories/kids-illustrated.png'), artIds: ['kite_afternoon_meadow', 'balloons', 'puppy', 'train', 'rocket'] },
  { id: 'family', label: 'Family', image: require('../assets/images/categories/family-illustrated.png'), artIds: ['family_picnic_garden'] },
  { id: 'sports', label: 'Sports', image: require('../assets/images/categories/sports-illustrated.png'), artIds: ['sunset_soccer_pitch'] },
  { id: 'east-asia', label: 'East Asia', image: require('../assets/images/categories/east-asia.png'), artIds: ['sakura_temple', 'sushi', 'panda'] },
  { id: 'black-communities', label: 'Black Communities', image: require('../assets/images/categories/black-communities-illustrated.png'), artIds: ['sunny_market_stall'] },
  { id: 'india', label: 'India', image: require('../assets/images/categories/india-illustrated.png'), artIds: ['festival_of_lights_rangoli'] },
  { id: 'hobbies', label: 'Hobbies', image: require('../assets/images/categories/hobbies-illustrated.png'), artIds: ['knitting_corner_basket', 'room', 'sailboat', 'sunset_soccer_pitch'] },
  { id: 'animals', label: 'Animals', image: require('../assets/images/categories/animals.png'), artIds: ['deer'] },
  { id: 'nature', label: 'Nature', image: require('../assets/images/categories/nature.png'), artIds: ['hills'] },
  { id: 'places', label: 'Places', image: require('../assets/images/categories/places.png'), artIds: ['town'] },
  { id: 'cute', label: 'Cute', image: require('../assets/images/categories/cute.png'), artIds: ['kawaii_cake'] },
  { id: 'simple', label: 'Simple', image: require('../assets/images/categories/simple.png'), artIds: ['cactus', 'kawaii_sky', 'kite_afternoon_meadow'] },
  { id: 'comics', label: 'Comics', image: require('../assets/images/categories/comics.png'), artIds: ['cosmic_comic_rocket'] },
  { id: 'vehicles', label: 'Vehicles', image: require('../assets/images/categories/vehicles.png'), artIds: ['train'] },
  { id: 'holidays', label: 'Holidays', image: require('../assets/images/categories/holidays.png'), artIds: ['xmas_tree', 'festival_of_lights_rangoli'] },
];

const categoriesByLabel = new Map(ART_CATEGORIES.map((category) => [category.label, category]));

export function matchesCategory(art: NumberArt, label: string): boolean {
  return art.category === label || (categoriesByLabel.get(label)?.artIds.includes(art.id) ?? false);
}




