import { useEffect, useState } from 'react';

const SurveyBanner = ({ title, description, imageUrl }) => {
  const [mounted, setMounted] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // Reset error state when imageUrl changes
    setImageError(false);
    setImageLoaded(false);
  }, [imageUrl]);

  const handleImageError = () => {
    console.warn('Survey banner image failed to load:', imageUrl);
    console.warn('This usually means the OpenAI-generated URL has expired. Please regenerate the image from the Admin panel.');
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  return (
    <div className="relative w-full overflow-hidden rounded-xl shadow-2xl mb-8">
      {/* Background with gradient and pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700">
        {/* Texture overlay - animated grain effect */}
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full">
            <filter id="noise">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.8"
                numOctaves="4"
                stitchTiles="stitch"
              />
              <feColorMatrix type="saturate" values="0"/>
            </filter>
            <rect width="100%" height="100%" filter="url(#noise)" />
          </svg>
        </div>

        {/* Geometric pattern overlay */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl transform translate-x-1/3 translate-y-1/3"></div>
        </div>

        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `
              linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent),
              linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent)
            `,
            backgroundSize: '50px 50px'
          }}
        ></div>
      </div>

      {/* Content container */}
      <div className="relative z-10 flex items-center min-h-[280px]">
        {/* Left side - AI Generated Illustration */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-12">
          <div
            className={`
              relative w-full max-w-md aspect-square rounded-2xl
              bg-white bg-opacity-10 backdrop-blur-sm
              border-2 border-white border-opacity-20
              flex items-center justify-center overflow-hidden
              transition-all duration-1000 transform
              ${mounted ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
            `}
          >
            {/* AI Generated Image */}
            {imageUrl && !imageError && (
              <img
                src={imageUrl}
                alt={`AI illustration for ${title}`}
                className="absolute inset-0 w-full h-full object-cover rounded-2xl"
                loading="lazy"
                onError={handleImageError}
                onLoad={handleImageLoad}
              />
            )}

            {/* Loading indicator while image loads */}
            {imageUrl && !imageError && !imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-10">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
              </div>
            )}

            {/* Fallback placeholder (if no image or image error) */}
            {(!imageUrl || imageError) && (
              <div className="absolute inset-0 flex items-center justify-center p-8">
                <div className="relative w-full h-full">
                  {/* Center circle */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-white bg-opacity-20 rounded-full animate-pulse"></div>

                  {/* Orbiting elements */}
                  <div className="absolute top-1/4 left-1/4 w-16 h-16 bg-yellow-300 bg-opacity-30 rounded-lg transform rotate-12"></div>
                  <div className="absolute top-1/3 right-1/4 w-20 h-20 bg-pink-300 bg-opacity-30 rounded-full"></div>
                  <div className="absolute bottom-1/4 left-1/3 w-12 h-12 bg-green-300 bg-opacity-30 rounded-lg transform -rotate-12"></div>
                  <div className="absolute bottom-1/3 right-1/3 w-24 h-16 bg-blue-300 bg-opacity-30 rounded-full transform rotate-45"></div>

                  {/* Icon overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <svg className="w-24 h-24 text-white opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {/* AI badge */}
            <div className="absolute -bottom-3 -right-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
              </svg>
              {imageUrl && !imageError ? 'AI Generated' : imageError ? 'Image Expired' : 'AI Ready'}
            </div>
          </div>
        </div>

        {/* Right side - Text content */}
        <div className="w-full lg:w-1/2 p-8 lg:p-12 lg:pr-16">
          <div
            className={`
              transition-all duration-1000 delay-300 transform
              ${mounted ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'}
            `}
          >
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight drop-shadow-lg">
              {title || 'Workshop Survey'}
            </h1>
            <p className="text-lg text-white text-opacity-90 leading-relaxed drop-shadow-md">
              {description || 'Please fill out all fields to submit your responses.'}
            </p>

            {/* Decorative line */}
            <div className="mt-6 w-24 h-1 bg-white bg-opacity-50 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black opacity-10"></div>
    </div>
  );
};

export default SurveyBanner;
