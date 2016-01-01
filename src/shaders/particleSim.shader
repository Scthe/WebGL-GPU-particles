[vertex shader]
precision highp float;

#include "packingUtils.shader"

uniform float uTime;
uniform float uScale;
uniform sampler2D tNoise;

attribute vec4 particlePositionAndTime; // x,y,z,velocity
attribute vec4 particleMiscData;        // colorStart, colorEnd, size+turbulence, spawntime+lifespan

#define P_POS        (particlePositionAndTime.xyz)
#define P_VEL_C      (particlePositionAndTime.w)
// #define P_VELOCITY   ((vel4.xyz - 0.5) * 2.0) // previously was u8, now is [0..1]
#define P_VELOCITY   (vel4.xyz)
// #define P_ (velTurb.w) // unused
#define P_COLOR_ST   (particleMiscData.x)
#define P_COLOR_END  (particleMiscData.y)
#define P_SCALE_TURB (particleMiscData.z)
#define P_SCALE_ST   (scaleTurb.x)
#define P_SCALE_END  (scaleTurb.y)
#define P_TURB_ST    (scaleTurb.z)
#define P_TURB_END   (scaleTurb.w)
#define P_LIFESPAN   (2.0)
#define P_SPAWN_TIME (particleMiscData.w)
// #define P_LIFESPAN   (particleMiscData.a)

varying vec4 vColor;
varying float lifeLeft;

void main() {
    // unpack values from attributes
    vec4 colorStart = decodeUint8VectorFromFloat(P_COLOR_ST);
    vec4 colorEnd   = decodeUint8VectorFromFloat(P_COLOR_END);
    vec4 vel4       = decodeUint8VectorFromFloat(P_VEL_C);
    vec4 scaleTurb  = decodeUint8VectorFromFloat(P_SCALE_TURB);

    // handle lifetime
#define P_LIFE_MOMENT (timeElapsedFromSpawn / P_LIFESPAN)
    float timeElapsedFromSpawn = uTime - P_SPAWN_TIME;
    lifeLeft = 1.0 - P_LIFE_MOMENT;

    // set color and scale, interpolate values based on life moment
    float turbulence = mix(P_TURB_ST, P_TURB_END, P_LIFE_MOMENT);

    // simple linear extrapolation
    vec3 newPosition = P_POS + P_VELOCITY * timeElapsedFromSpawn * 5.0; // magic number

    // add random turbulence - use noise texture as source of random variables
    // the older the particle is, the more turbulence over life
    vec2 particleTexurePos = vec2(newPosition.x * 0.015 + (uTime * 0.050),
                                  newPosition.y * 0.020 + (uTime * 0.015));
    vec3 noise = texture2D(tNoise, particleTexurePos).rgb - 0.5; //  from [0..1] to [-0.5..0.5]
    newPosition = mix(newPosition,
                      newPosition + noise.rgb * 150.0, // magic number
                      turbulence);


    if (P_LIFE_MOMENT < 0.0 || P_LIFE_MOMENT >= 1.0){
      // pre spawn or after lifetime
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = 0.0;
      vColor.w = 0.0;
      lifeLeft = 0.0;
    } else {
      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
      vColor = mix(colorStart, colorEnd, P_LIFE_MOMENT);
      gl_PointSize = uScale * mix(P_SCALE_ST, P_SCALE_END, P_LIFE_MOMENT) * 255.0; // magic number
    }
}

//////////////////////////////////////////////
//////////////////////////////////////////////
//////////////////////////////////////////////
[fragment shader]

varying vec4 vColor;
varying float lifeLeft;

uniform sampler2D tSprite;

void main() {
    vec4 tex = texture2D(tSprite, gl_PointCoord);

    if (lifeLeft < .05){ // prevents weird things
      tex.a = lifeLeft * .75;
    }

    gl_FragColor = vColor * tex.a;
}
