# Dark Soon: game concept

A flick-screen platformer in the spirit of Jet Set Willy: one big, strange house to explore room by room, things to collect everywhere, and every room with its own silly name. It's built for kids today, so it's gentler and much better looking, drawn in the style of cartoons like Gravity Falls and Amphibia.

## The story

Isaac is spending the summer at Great-Aunt Rhona's cabin deep in the pine woods, with Bean, Isaac's pet frog. The cabin is full of peculiar things: books that read back, a clock with an eye, toys that wander around on their own. Firefly lanterns keep all of it sleepy. This evening the fireflies have escaped, and the sun is going down. It'll be dark soon, so Isaac has to catch every firefly before night falls.

Jet Set Willy had Willy tidying up after a party before he could go to bed. Dark Soon keeps that shape (collect everything, against the clock) with a hero, a sidekick and a reason kids can picture.

## Look and feel

- **Cartoon style.** Flat colours, bold dark outlines, big expressive eyes, the cosy-but-a-bit-creepy feel of Gravity Falls and Amphibia. The characters are our own, not borrowed from those shows.
- **Sunset to night.** A window in every room shows the sun setting behind the pines. A meter at the top of the screen shows the sun sliding down. As the evening runs out, the rooms get darker and the light pools around Isaac, the lanterns and the fireflies matter more.
- **Bean the frog** hops along behind Isaac and gives a ribbit for every firefly caught.
- **Everything has eyes.** The marching spoon, the bouncing ball, the flapping books: the house's oddities are funny first and spooky second.

## What we keep from Jet Set Willy

- **Flick-screen rooms.** The screen doesn't scroll. Walk off an edge and you're in the next room, which is its own little puzzle.
- **One big connected house.** Rooms connect left, right, up and down. Exploring is the point.
- **Collect everything.** Fireflies are hidden all over the house, with a counter showing how many are left.
- **Quirky room names.** "The Library That Reads Back", "Where Lost Socks Go".
- **Patrolling guardians** that move in fixed patterns.

## What we change for kids today

| Jet Set Willy | Dark Soon |
|---|---|
| One touch and you lose a life | Three hearts, with a short flash of safety after each hit |
| Game over sends you back to the start | No game over. Running out of hearts means Isaac "had a funny dream" and wakes at the last lantern they lit |
| Fixed, unforgiving jump | Floaty jump you can steer, with a little grace time after walking off a ledge |
| The clock ends your game | The sunset is a goal, not a punishment. Beat it and the ending says so. Miss it and the house just gets livelier (guardians speed up) until you finish |
| Infamous impossible bugs | Every firefly is reachable |
| Keyboard only | Keyboard, plus on-screen buttons on tablets and phones |

## Rooms in the prototype

1. **The Creaky Bunk Room** (start). Bouncy bunk bed and a wind-up mouse.
2. **Hall of Peculiar Things.** Jars with eyes, antlers, a clock that watches you. A climb up through a hole in the ceiling, a bouncing ball and a flying slipper, and toy bricks on the floor.
3. **The Kitchen Nobody Cleans.** Moving conveyor countertops, a marching spoon and a bouncing pea.
4. **The Library That Reads Back.** Above the hall. Flapping books patrol the shelves.
5. **Where Lost Socks Go.** The attic, with an old mattress to bounce on, a moth and a hopping dust bunny.

21 fireflies in total. The sunset takes 5 minutes.

## Ideas for the full game

- 40 to 60 rooms: the roof, a cellar, the woods outside, a bathroom with rising bath water, a games room where the board pieces move.
- Small abilities found along the way (sticky frog-tongue swing from Bean, an umbrella for slow falling) to open new parts of the cabin, so it grows into a gentle metroidvania.
- A map that fills in as you explore.
- Each night a different "mystery" with its own set of things to collect.
- Two-player couch mode where the second player controls Bean.

## How to build the full version

The prototype is a single web page, which is great for trying ideas and sharing a link. For the full game, **Godot** is a strong fit, and you already know it from Isaac Quest. Its tilemap editor would make designing dozens of rooms much faster than hand-coding them, and it exports to web, desktop, tablets and phones. Proper hand-drawn sprites (or a sprite artist) would take the cartoon look much further than drawing with code can.
