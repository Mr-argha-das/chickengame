import { FileIcon, Trash2Icon, UploadCloudIcon, XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const Banners = () => {
  const [bannerImage, setBannerImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [title, setTitle] = useState("");
  const [link, setLink] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [banners, setBanners] = useState([]);
  const inputRef = useRef(null);

  const authHeaders = () => ({
    Authorization: localStorage.getItem("accessToken") || "",
  });

  const fetchBanners = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/banners`);
      const data = await res.json();
      if (data.success) setBanners(data.data);
    } catch (error) {
      console.error("Failed to fetch banners", error);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const setSelectedFile = (file) => {
    if (!file) return;
    setBannerImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    setSelectedFile(event.dataTransfer.files[0]);
  };

  const handleRemoveImage = () => {
    setBannerImage(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = null;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!bannerImage) {
      alert("Please select a banner image");
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("banner", bannerImage);
      formData.append("title", title || "Home Banner");
      formData.append("link", link);

      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/banners`, {
        method: "POST",
        headers: authHeaders(),
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Upload failed");

      alert("Banner added successfully");
      setTitle("");
      setLink("");
      handleRemoveImage();
      fetchBanners();
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this banner?")) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/banners/${id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });

      if (!res.ok) throw new Error("Delete failed");

      fetchBanners();
    } catch (error) {
      alert("Failed to delete banner");
    }
  };

  return (
    <div className="min-h-screen w-full p-6 text-white">
      <h2 className="mb-4 text-2xl font-bold">Home Banners</h2>

      <form
        onSubmit={handleSubmit}
        className="mb-8 w-full max-w-xl rounded-lg bg-gray-800 p-5 shadow-lg"
      >
        <div className="mb-4 grid gap-3 md:grid-cols-2">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Banner title"
            className="rounded bg-gray-900 px-3 py-2 text-white outline-none ring-1 ring-gray-700 focus:ring-amber-300"
          />
          <input
            value={link}
            onChange={(event) => setLink(event.target.value)}
            placeholder="Optional link, e.g. /deposite"
            className="rounded bg-gray-900 px-3 py-2 text-white outline-none ring-1 ring-gray-700 focus:ring-amber-300"
          />
        </div>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current.click()}
          className={`mb-4 cursor-pointer rounded-lg border-2 border-dashed p-6 transition ${
            isDragging ? "border-amber-300 bg-gray-700" : "border-gray-600"
          }`}
        >
          {!bannerImage ? (
            <div className="flex h-28 flex-col items-center justify-center text-center">
              <UploadCloudIcon className="mb-2 h-10 w-10 text-gray-400" />
              <span className="text-gray-300">Drag & drop or click to upload banner</span>
              <span className="mt-1 text-xs text-gray-500">Recommended: wide image</span>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg bg-gray-700 px-3 py-2">
              <div className="flex items-center gap-2">
                <FileIcon className="h-6 w-6 text-amber-300" />
                <p className="text-sm">{bannerImage.name}</p>
              </div>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleRemoveImage();
                }}
                className="text-red-400 hover:text-red-300"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        <input
          type="file"
          accept="image/*"
          ref={inputRef}
          onChange={(event) => setSelectedFile(event.target.files[0])}
          className="hidden"
        />

        {preview && (
          <img
            src={preview}
            alt="Banner preview"
            className="mb-4 h-36 w-full rounded object-cover ring-1 ring-gray-700"
          />
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-amber-500 py-2 font-semibold text-black hover:bg-amber-400 disabled:bg-gray-500"
        >
          {loading ? "Uploading..." : "Add Banner"}
        </button>
      </form>

      <div className="grid w-full max-w-5xl gap-4 md:grid-cols-2">
        {banners.map((banner) => (
          <div key={banner._id} className="rounded-lg bg-gray-800 p-3">
            <img
              src={`${import.meta.env.VITE_API_URL}${banner.imageUrl}`}
              alt={banner.title}
              className="mb-3 h-40 w-full rounded object-cover"
            />
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{banner.title}</p>
                {banner.link && <p className="text-xs text-gray-400">{banner.link}</p>}
              </div>
              <button
                onClick={() => handleDelete(banner._id)}
                className="flex items-center gap-1 rounded bg-red-600 px-3 py-1 text-sm hover:bg-red-700"
              >
                <Trash2Icon className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {banners.length === 0 && <p className="text-gray-400">No banners added yet.</p>}
    </div>
  );
};

export default Banners;
