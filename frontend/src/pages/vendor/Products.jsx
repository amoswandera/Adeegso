import React, { useState, useEffect } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiFilter, FiChevronDown, FiChevronUp, FiPlusCircle } from 'react-icons/fi';
import { vendorAPI } from '../../services/api';

const ProductCard = ({ product, onEdit, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center">
              {product.image ? (
                <img
                  src={product.image}
                  alt={product.name}
                  className="h-16 w-16 rounded-md object-cover mr-4"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : (
                <div className="h-16 w-16 rounded-md bg-gray-200 flex items-center justify-center text-gray-400 mr-4">
                  <FiPlusCircle size={24} />
                </div>
              )}
              <div className="hidden">
                <div className="h-16 w-16 rounded-md bg-gray-200 flex items-center justify-center text-gray-400">
                  <FiPlusCircle size={24} />
                </div>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">{product.name}</h3>
                <p className="text-sm text-gray-500">{product.category}</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">${product.price.toFixed(2)}</p>
              </div>
            </div>
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={() => onEdit(product)}
              className="p-2 text-gray-500 hover:text-brand-blue hover:bg-blue-50 rounded-full"
              title="Edit product"
            >
              <FiEdit2 size={18} />
            </button>
            <button 
              onClick={() => onDelete(product.id)}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-full"
              title="Delete product"
            >
              <FiTrash2 size={18} />
            </button>
            <button 
              onClick={() => setExpanded(!expanded)}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-full"
            >
              {expanded ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
            </button>
          </div>
        </div>
        
        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            {product.description && (
              <p className="text-sm text-gray-600 mb-3">{product.description}</p>
            )}
            <div className="flex flex-wrap gap-2">
              {product.tags?.map((tag, index) => (
                <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {tag}
                </span>
              ))}
            </div>
            {product.variants && product.variants.length > 0 && (
              <div className="mt-3">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Variants</h4>
                <div className="space-y-2">
                  {product.variants.map((variant, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-gray-600">{variant.name}</span>
                      <span className="font-medium">+${variant.price.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
const ProductForm = ({ product, onSave, onCancel, isEditing }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    tags: '',
    inStock: true,
    image: null,
    variants: []
  });

  useEffect(() => {
    if (isEditing && product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        price: product.price || '',
        category: product.category || '',
        tags: product.tags?.join(', ') || '',
        inStock: product.inStock !== false,
        image: product.image || null,
        variants: product.variants || []
      });
    }
  }, [product, isEditing]);

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked :
              type === 'file' ? (files && files[0] ? files[0] : null) : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Handle image upload - if it's a File object, we need to keep it as is
    // If it's a string URL, keep it as string
    // If no image, set to null
    let imageToSave = formData.image;

    // If it's a File object from input, keep it
    // If it's a string (existing image), keep it
    // If no image selected, set to null
    if (!formData.image) {
      imageToSave = null;
    }

    const dataToSave = {
      ...formData,
      price: parseFloat(formData.price),
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      image: imageToSave
    };
    onSave(dataToSave);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-6">
        {isEditing ? 'Edit Product' : 'Add New Product'}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                name="price"
                min="0"
                step="0.01"
                value={formData.price}
                onChange={handleChange}
                className="focus:ring-brand-blue focus:border-brand-blue block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
                placeholder="0.00"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
              required
            >
              <option value="">Select a category</option>
              <option value="Appetizers">Appetizers</option>
              <option value="Main Course">Main Course</option>
              <option value="Desserts">Desserts</option>
              <option value="Beverages">Beverages</option>
              <option value="Sides">Sides</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <div className="flex items-center h-5">
              <input
                id="inStock"
                name="inStock"
                type="checkbox"
                checked={formData.inStock}
                onChange={handleChange}
                className="h-4 w-4 text-brand-blue focus:ring-brand-blue border-gray-300 rounded"
              />
              <label htmlFor="inStock" className="ml-2 block text-sm text-gray-700">
                In Stock
              </label>
            </div>
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              placeholder="e.g. spicy, vegan, gluten-free"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue"
            />
          </div>
          
            <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Image</label>
            <div className="mt-1 flex items-center">
              <span className="inline-block h-12 w-12 rounded-md overflow-hidden bg-gray-100">
                {formData.image ? (
                  typeof formData.image === 'string' ? (
                    <img
                      src={formData.image}
                      alt="Preview"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                  ) : (
                    <img
                      src={URL.createObjectURL(formData.image)}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                  )
                ) : (
                  <svg
                    className="h-full w-full text-gray-300"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                )}
              </span>
              <label
                htmlFor="image-upload"
                className="ml-5 bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue cursor-pointer"
              >
                <span>{formData.image ? 'Change Image' : 'Upload Image'}</span>
                <input
                  id="image-upload"
                  name="image"
                  type="file"
                  className="sr-only"
                  onChange={handleChange}
                  accept="image/*"
                />
              </label>
            </div>
            {formData.image && (
              <p className="mt-1 text-sm text-gray-500">
                {typeof formData.image === 'string' ? 'Current image' : 'New image selected'}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand-blue hover:bg-brand-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue"
          >
            {isEditing ? 'Update Product' : 'Add Product'}
          </button>
        </div>
      </form>
    </div>
  );
};

const Products = () => {
  const outletContext = useOutletContext();
  const vendorData = outletContext?.vendorData || {
    name: 'Test Restaurant',
    approved: true
  };
  const loading = outletContext?.loading || false;

  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setProductsLoading(true);

        // Temporarily disable API calls - show mock data instead
        console.log('Vendor products - API calls disabled for testing');

        // Mock products data
        setProducts([
          {
            id: 1,
            name: 'Grilled Chicken Burger',
            description: 'Juicy grilled chicken breast with fresh lettuce, tomato, and our special sauce on a toasted bun.',
            category: 'Main Course',
            price: 12.99,
            inStock: true,
            tags: ['spicy', 'grilled', 'chicken'],
            image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300&h=300&fit=crop&crop=center',
            variants: []
          },
          {
            id: 2,
            name: 'Caesar Salad',
            description: 'Fresh romaine lettuce with parmesan cheese, croutons, and our homemade Caesar dressing.',
            category: 'Appetizers',
            price: 8.99,
            inStock: true,
            tags: ['vegetarian', 'healthy'],
            image: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=300&h=300&fit=crop&crop=center',
            variants: []
          },
          {
            id: 3,
            name: 'Chocolate Lava Cake',
            description: 'Warm chocolate cake with a molten center, served with vanilla ice cream.',
            category: 'Desserts',
            price: 6.99,
            inStock: true,
            tags: ['dessert', 'chocolate', 'warm'],
            image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=300&h=300&fit=crop&crop=center',
            variants: []
          }
        ]);

      } catch (error) {
        console.error('Error fetching products:', error);
        // Fallback to empty array
        setProducts([]);
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const categories = products.length > 0 ? ['All', ...new Set(products.map(p => p.category))] : ['All'];
  
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddProduct = () => {
    setEditingProduct(null);
    setShowForm(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleDeleteProduct = async (productId) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        // Temporarily disable API calls
        console.log('Product deletion disabled for testing');
        setProducts(products.filter(p => p.id !== productId));
        alert('Product deleted successfully (mock data)');
      } catch (error) {
        console.error('Error deleting product:', error);
        alert('Failed to delete product. Please try again.');
      }
    }
  };

  const handleSaveProduct = async (productData) => {
    try {
      if (editingProduct) {
        // Update existing product
        console.log('Product update disabled for testing');
        const updatedProduct = {
          ...editingProduct,
          ...productData
        };
        setProducts(products.map(p =>
          p.id === editingProduct.id ? updatedProduct : p
        ));
        alert('Product updated successfully (mock data)');
      } else {
        // Add new product
        console.log('Product creation disabled for testing');
        const newProduct = {
          ...productData,
          id: Math.max(...products.map(p => p.id), 0) + 1,
          // If no image provided, use a default placeholder
          image: productData.image || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=300&fit=crop&crop=center'
        };
        setProducts([...products, newProduct]);
        alert('Product added successfully (mock data)');
      }
      setShowForm(false);
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product. Please try again.');
    }
  };

  if (loading || productsLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menu Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your restaurant's menu items and categories
          </p>
        </div>
        <button
          onClick={handleAddProduct}
          className="mt-4 md:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-blue hover:bg-brand-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue"
        >
          <FiPlus className="mr-2 h-4 w-4" />
          Add Product
        </button>
      </div>

      {showForm ? (
        <ProductForm 
          product={editingProduct} 
          onSave={handleSaveProduct} 
          onCancel={() => setShowForm(false)}
          isEditing={!!editingProduct}
        />
      ) : (
        <>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0 md:space-x-4">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search products..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue sm:text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <FiFilter className="h-5 w-5 text-gray-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-brand-blue sm:text-sm rounded-md"
                >
                  <option value="all">All Categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                <FiPackage className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No products</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || selectedCategory !== 'all' 
                  ? 'No products match your search criteria.'
                  : 'Get started by adding a new product.'}
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleAddProduct}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand-blue hover:bg-brand-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue"
                >
                  <FiPlus className="-ml-1 mr-2 h-5 w-5" />
                  New Product
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onEdit={handleEditProduct}
                  onDelete={handleDeleteProduct}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Products;
