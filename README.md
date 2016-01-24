# WebGL GPU particles ([Demo](https://scthe.github.io/WebGL-GPU-particles/))

Particle editor. Works best on chrome.

# Build

1. `npm install`
2. `node_modules\.bin\tsd install` - this will download all type informations for external libraries
3. `grunt build` to run the build
4. open **index.html** that is found in **build** directory

# Tips

* After You change particle count do not forget to increase spawn rate!
* Changing particle count multiple times may slow down the simulation. It's best to refresh the window.
* I could not quite get the initial velocity parameter to work, so it is locked at 0.

# Preview

![sample2]
![sample1]
![sample3]

[sample1]:images/magic.jpg
[sample2]:images/random_net.jpg
[sample3]:images/trail2.jpg
