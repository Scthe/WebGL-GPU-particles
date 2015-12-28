[vertex shader]

precision highp float;
const vec4 bitSh = vec4(256. * 256. * 256., 256. * 256., 256., 1.);
const vec4 bitMsk = vec4(0.,vec3(1./256.0));
const vec4 bitShifts = vec4(1.) / bitSh;

#define FLOAT_MAX  1.70141184e38
#define FLOAT_MIN  1.17549435e-38

lowp vec4 encode_float(highp float v) {
    highp float av = abs(v);

    //Handle special cases
    if(av < FLOAT_MIN) {
        return vec4(0.0, 0.0, 0.0, 0.0);
        } else if(v > FLOAT_MAX) {
        return vec4(127.0, 128.0, 0.0, 0.0) / 255.0;
        } else if(v < -FLOAT_MAX) {
        return vec4(255.0, 128.0, 0.0, 0.0) / 255.0;
    }

    highp vec4 c = vec4(0,0,0,0);

    //Compute exponent and mantissa
    highp float e = floor(log2(av));
    highp float m = av * pow(2.0, -e) - 1.0;

    //Unpack mantissa
    c[1] = floor(128.0 * m);
    m -= c[1] / 128.0;
    c[2] = floor(32768.0 * m);
    m -= c[2] / 32768.0;
    c[3] = floor(8388608.0 * m);

    //Unpack exponent
    highp float ebias = e + 127.0;
    c[0] = floor(ebias / 2.0);
    ebias -= c[0] * 2.0;
    c[1] += floor(ebias) * 128.0;

    //Unpack sign bit
    c[0] += 128.0 * step(0.0, -v);

    //Scale back to range
    return c / 255.0;
}

vec4 pack(const in float depth)
{
    const vec4 bit_shift = vec4(256.0*256.0*256.0, 256.0*256.0, 256.0, 1.0);
    const vec4 bit_mask  = vec4(0.0, 1.0/256.0, 1.0/256.0, 1.0/256.0);
    vec4 res = fract(depth * bit_shift);
    res -= res.xxyz * bit_mask;
    return res;
}

float unpack(const in vec4 rgba_depth)
{
    const vec4 bit_shift = vec4(1.0/(256.0*256.0*256.0), 1.0/(256.0*256.0), 1.0/256.0, 1.0);
    float depth = dot(rgba_depth, bit_shift);
    return depth;
}

uniform float uTime;
uniform float uScale;
uniform sampler2D tNoise;

attribute vec4 particlePositionAndTime;
attribute vec4 particleMiscData;

varying vec4 vColor;
varying float lifeLeft;

void main() {

    // unpack things from our attributes
    vColor = encode_float( particleMiscData.y );

    // convert our velocity back into a value we can use
    vec4 velTurb = encode_float( particleMiscData.x );
    vec3 velocity = vec3( velTurb.xyz );
    float turbulence = velTurb.w;

    vec3 newPosition;

    float timeElapsed = uTime - particlePositionAndTime.a;

    lifeLeft = 1. - (timeElapsed / particleMiscData.w);

    gl_PointSize = ( uScale * particleMiscData.z ) * lifeLeft;

    velocity.x = ( velocity.x - .5 ) * 3.;
    velocity.y = ( velocity.y - .5 ) * 3.;
    velocity.z = ( velocity.z - .5 ) * 3.;

    newPosition = particlePositionAndTime.xyz + ( velocity * 10. ) * ( uTime - particlePositionAndTime.a );

    vec3 noise = texture2D( tNoise, vec2( newPosition.x * .015 + (uTime * .05), newPosition.y * .02 + (uTime * .015) )).rgb;
    vec3 noiseVel = ( noise.rgb - .5 ) * 30.;

    newPosition = mix(newPosition, newPosition + vec3(noiseVel * ( turbulence * 5. ) ), (timeElapsed / particleMiscData.a) );

    if( velocity.y > 0. && velocity.y < .05 ) {
        lifeLeft = 0.;
    }

    if( velocity.x < -1.45 ) {
        lifeLeft = 0.;
    }

    if( timeElapsed > 0. ) {
        gl_Position = projectionMatrix * modelViewMatrix * vec4( newPosition, 1.0 );
        } else {
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        lifeLeft = 0.;
        gl_PointSize = 0.;
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

    vec4 tex = texture2D( tSprite, gl_PointCoord );

    gl_FragColor = vec4( vColor.rgb * tex.a, alpha * tex.a );
}
