import Blog from '../model/Blog.js';

// GET /api/blogs
export const getAllBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 }); // newest first
    res.status(200).json(blogs);
  } catch (error) {
    console.error("Error fetching blogs:", error);
    res.status(500).json({ message: "Failed to fetch blogs." });
  }
};

// Create a new blog
export const createBlog = async (req, res) => {
  try {
    const { title, category, content, author, date, image } = req.body;

    if (!title || !category || !content || !author) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newBlog = new Blog({
      title,
      category,
      content,
      author,
      date: date || new Date(),
      image,
    });

    await newBlog.save();
    res.status(201).json(newBlog);
  } catch (error) {
    console.error('Error creating blog:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
