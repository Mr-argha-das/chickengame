import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const BannerCarousel = () => {
  const [banners, setBanners] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/v1/banners`)
      .then((response) => response.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setBanners(data.data);
        }
      })
      .catch((error) => console.error("Failed to load banners", error));
  }, []);

  useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setActiveIndex((current) => (current + 1) % banners.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [banners.length]);

  if (banners.length === 0) return null;

  const activeBanner = banners[activeIndex];
  const image = (
    <img
      src={`${import.meta.env.VITE_API_URL}${activeBanner.imageUrl}`}
      alt={activeBanner.title}
      className="h-full w-full object-cover"
    />
  );

  return (
    <section className="mx-auto mt-2 w-full max-w-3xl px-5">
      <div className="relative h-36 overflow-hidden rounded-lg border border-[#9C1137]/70 bg-black shadow-lg shadow-[#9C1137]/20 md:h-64">
        {activeBanner.link ? (
          <Link to={activeBanner.link} className="block h-full w-full">
            {image}
          </Link>
        ) : (
          image
        )}

        {banners.length > 1 && (
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">
            {banners.map((banner, index) => (
              <button
                key={banner._id}
                onClick={() => setActiveIndex(index)}
                aria-label={`Show banner ${index + 1}`}
                className={`h-2.5 w-2.5 rounded-full transition ${
                  index === activeIndex ? "bg-amber-200" : "bg-white/50"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default BannerCarousel;
