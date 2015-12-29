[vertex shader]
precision highp float;

#include "packingUtils.shader"

uniform float uTime;
uniform float uScale;
uniform sampler2D tNoise;

attribute vec4 particlePositionAndTime; // x,y,z,time
attribute vec4 particleMiscData;        // velocity.xyz + turbulence, color, size, lifespan

#define P_SPAWN_TIME (particlePositionAndTime.a)
#define P_TURBULENCE (velTurb.w)
#define P_COLOR (particleMiscData.y)
#define P_SCALE (particleMiscData.z)
#define P_LIFESPAN (particleMiscData.a)

varying vec4 vColor;
varying float lifeLeft;

void main() {
    // unpack values from attributes
    vColor = encode_float(P_COLOR);
    vec4 velTurb = encode_float(particleMiscData.x);
    vec3 velocity = velTurb.xyz;

    // handle lifetime
#define P_LIFE_MOMENT (timeElapsedFromSpawn / P_LIFESPAN)
    float timeElapsedFromSpawn = uTime - P_SPAWN_TIME;
    lifeLeft = 1.0 - P_LIFE_MOMENT;

    // set scale (bigger as life goes)
    gl_PointSize = (uScale * P_SCALE) * lifeLeft;

    // simple linear extrapolation
    vec3 newPosition = particlePositionAndTime.xyz + ( velocity * 10.0 ) * timeElapsedFromSpawn;

    // add random turbulence - use noise texture as source of random variables
    // the older the particle is, the more turbulence over life
    vec2 particleTexurePos = vec2(newPosition.x * 0.015 + (uTime * 0.050),
                                  newPosition.y * 0.020 + (uTime * 0.015));
    vec3 noise = texture2D(tNoise, particleTexurePos).rgb;
    vec3 noiseVel = (noise.rgb - 0.5) * 30.0;  // TODO magic noise strength?
    newPosition = mix(newPosition,
                      newPosition + vec3(noiseVel * (P_TURBULENCE * 5.0)), // TODO magic turbulence strength?
                      P_LIFE_MOMENT);

    if(timeElapsedFromSpawn > 0.0) {
      gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    } else {
      // on spawn
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      lifeLeft = 0.0;
      gl_PointSize = 0.0;
    }
}

//////////////////////////////////////////////
//////////////////////////////////////////////
//////////////////////////////////////////////
[fragment shader]

float scaleLinear(float value, vec2 valueDomain) {
    return (value - valueDomain.x) / (valueDomain.y - valueDomain.x);
}

float scaleLinear(float value, vec2 valueDomain, vec2 valueRange) {
    return mix(valueRange.x, valueRange.y, scaleLinear(value, valueDomain));
}

varying vec4 vColor;
varying float lifeLeft;

uniform sampler2D tSprite;

void main() {

    float alpha = 0.;

    if( lifeLeft > .995 ) {
      alpha = scaleLinear( lifeLeft, vec2(1., .995), vec2(0., 1.));//mix( 0., 1., ( lifeLeft - .95 ) * 100. ) * .75;
    } else {
      alpha = lifeLeft * .75;
    }

    vec4 tex = texture2D(tSprite, gl_PointCoord);

    gl_FragColor = vec4(vColor.rgb * tex.a, alpha * tex.a);
}
