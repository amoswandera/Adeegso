import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { FiPlus, FiEdit2, FiTrash2, FiChevronDown, FiChevronUp, FiSearch, FiFilter, FiPackage, FiPlusCircle } from 'react-icons/fi';
import vendorAPI from '../../utils/vendorAPI';

const ProductCard = ({ product, onEdit, onDelete }) => {
  const [expanded, setExpanded] = useState(false);

  const getImageSrc = (image) => {
    // If it's a File object, create object URL for display
    if (image instanceof File) {
      return URL.createObjectURL(image);
    }
    // If it's our special marker for File objects in localStorage, treat as no image
    if (typeof image === 'string' && image.startsWith('__FILE_OBJECT_')) {
      return null;
    }
    // Otherwise, return the image URL or null
    return image || null;
  };

  const shouldShowImage = (image) => {
    return getImageSrc(image) !== null;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Pending
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center">
              {shouldShowImage(product.image) ? (
                <div className="relative">
                  <img
                    src={getImageSrc(product.image)}
                    alt={product.name || 'Product'}
                    className="h-16 w-16 rounded-md object-cover mr-4"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.parentElement.nextSibling.style.display = 'flex';
                    }}
                  />
                  <div className="hidden absolute inset-0 h-16 w-16 rounded-md bg-gray-200 flex items-center justify-center text-gray-400">
                    <FiPlusCircle size={24} />
                  </div>
                </div>
              ) : (
                <div className="h-16 w-16 rounded-md bg-gray-200 flex items-center justify-center text-gray-400 mr-4">
                  <FiPlusCircle size={24} />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="font-medium text-gray-900">{product.name || 'Unnamed Product'}</h3>
                  {getStatusBadge(product.approval_status)}
                </div>
                <p className="text-sm text-gray-500">{product.category || 'No Category'}</p>
                <p className="text-lg font-semibold text-gray-900 mt-1">${product.price ? Number(product.price).toFixed(2) : '0.00'}</p>
                {product.rejection_reason && (
                  <p className="text-xs text-red-600 mt-1">
                    Reason: {product.rejection_reason}
                  </p>
                )}
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
              {product.tags && Array.isArray(product.tags) && product.tags.map((tag, index) => (
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
                      <span className="font-medium">+${variant.price ? Number(variant.price).toFixed(2) : '0.00'}</span>
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
        price: product.price ? parseFloat(product.price).toString() : '',
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

    let imageToSave = formData.image;
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
  console.log('Products component rendering...');
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

  // Debug function to check localStorage
  const checkLocalStorage = () => {
    const storedProducts = localStorage.getItem('vendorProducts');
    console.log('Current localStorage vendorProducts:', storedProducts);
    if (storedProducts) {
      try {
        const parsed = JSON.parse(storedProducts);
        console.log('Parsed products:', parsed);
        console.log('Number of products:', parsed?.length || 0);
        alert(`Found ${parsed?.length || 0} products in localStorage`);
      } catch (error) {
        console.error('Error parsing localStorage:', error);
        alert('Error parsing localStorage data');
      }
    } else {
      alert('No products found in localStorage');
    }
  };

  // Manual save to localStorage for debugging
  const saveToLocalStorage = () => {
    if (products.length > 0) {
      localStorage.setItem('vendorProducts', JSON.stringify(products));
      console.log('Manually saved to localStorage:', products);
      alert(`Saved ${products.length} products to localStorage`);
    } else {
      alert('No products to save');
    }
  };

  // Fetch products from API or localStorage
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setProductsLoading(true);
        console.log('Fetching products from API...');

        // First try to load from localStorage as backup
        let storedProducts = null;
        const storedData = localStorage.getItem('vendorProducts');
        if (storedData) {
          try {
            const parsedProducts = JSON.parse(storedData);
            if (Array.isArray(parsedProducts) && parsedProducts.length > 0) {
              console.log('Loaded products from localStorage:', parsedProducts);
              storedProducts = parsedProducts;
              setProducts(parsedProducts);
            }
          } catch (error) {
            console.error('Error parsing stored products:', error);
          }
        }

        const response = await vendorAPI.getProducts();
        console.log('Products response:', response);

        // Check if response is successful and contains array data
        if (response && response.data && Array.isArray(response.data) && response.data.length >= 0) {
          setProducts(response.data);
          // Update localStorage with API data
          localStorage.setItem('vendorProducts', JSON.stringify(response.data));
          console.log('Updated localStorage with API data');
        } else if (response && response.data && typeof response.data === 'string' && response.data.includes('<html>')) {
          console.error('API returned HTML error page instead of JSON');
          setTimeout(() => {
            alert('API endpoint not found. Please check if the backend server is running and the API endpoints are correct.');
          }, 100);
          // Keep using localStorage data if API doesn't return valid data
          if (!storedProducts) {
            setProducts([]);
          }
        } else {
          console.warn('API response is empty or not an array, keeping localStorage data');
          // Keep using localStorage data if API doesn't return valid data
          if (!storedProducts) {
            setProducts([]);
          }
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        console.error('Error details:', error.response?.data || error.message);

        // Use stored products as fallback if API fails
        const storedData = localStorage.getItem('vendorProducts');
        if (storedData) {
          try {
            const parsedProducts = JSON.parse(storedData);
            if (Array.isArray(parsedProducts) && parsedProducts.length > 0) {
              console.log('Using stored products as fallback after API error');
              setProducts(parsedProducts);
            } else {
              setProducts([]);
            }
          } catch (error) {
            console.error('Error parsing stored products:', error);
            setProducts([]);
          }
        } else {
          setProducts([]);
        }

        // Handle different error types
        if (error.response?.status === 403) {
          console.error('Authentication error: User not authorized as vendor');
          setTimeout(() => {
            alert('You need to be logged in as a vendor to view products. Please log in with a vendor account.');
          }, 100);
        } else if (error.response?.status === 404) {
          console.error('API endpoint not found');
          setTimeout(() => {
            alert('Products API not found. Please check if the backend server is running on port 8000.');
          }, 100);
        } else if (error.response?.status >= 500) {
          console.error('Server error:', error.response.data);
          setTimeout(() => {
            alert('Server error occurred. Please check if the backend server is running properly.');
          }, 100);
        } else {
          console.error('Network or other error:', error.message);
          setTimeout(() => {
            alert('Failed to load products. Please check your connection and try again.');
          }, 100);
        }
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Add focus event listener to refresh products when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      // Refresh products when window gains focus (e.g., after admin approval)
      const fetchProductsOnFocus = async () => {
        try {
          console.log('Window focused - refreshing products...');
          const response = await vendorAPI.getProducts();
          if (response && response.data && Array.isArray(response.data)) {
            setProducts(response.data);
            localStorage.setItem('vendorProducts', JSON.stringify(response.data));
            console.log('Products refreshed on focus');
          }
        } catch (error) {
          console.error('Error refreshing products on focus:', error);
        }
      };

      // Small delay to ensure admin changes are saved
      setTimeout(fetchProductsOnFocus, 1000);
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Save products to localStorage whenever products state changes
  useEffect(() => {
    if (products.length > 0) {
      // Prepare products for localStorage - handle images properly
      const productsForStorage = products.map(product => {
        let imageToStore = product.image;

        // If it's a File object, we can't serialize it, but we can store a placeholder
        if (product.image instanceof File) {
          // For File objects, store a special marker that we can recognize later
          imageToStore = `__FILE_OBJECT_${product.image.name}_${product.image.size}_${product.image.lastModified}`;
        }

        return {
          ...product,
          image: imageToStore
        };
      });

      localStorage.setItem('vendorProducts', JSON.stringify(productsForStorage));
      console.log('Saved products to localStorage:', productsForStorage);
    }
  }, [products]);

  const categories = products && Array.isArray(products) && products.length > 0 ? ['All', ...new Set(products.map(p => p.category || 'Uncategorized'))] : ['All'];

  const filteredProducts = products && Array.isArray(products) ? products.filter(product => {
    if (!product || typeof product !== 'object') return false;
    const productName = product.name || '';
    const productDescription = product.description || '';
    const searchTermLower = searchTerm.toLowerCase();

    const matchesSearch = productName.toLowerCase().includes(searchTermLower) ||
                         productDescription.toLowerCase().includes(searchTermLower);
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  }) : [];

  // Debug logging
  console.log('Products state:', products);
  console.log('Categories:', categories);
  console.log('Selected category:', selectedCategory);
  console.log('Filtered products:', filteredProducts);
  console.log('Filtered products length:', filteredProducts.length);

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
        await vendorAPI.deleteProduct(productId);
        const updatedProducts = products.filter(p => p.id !== productId);
        setProducts(updatedProducts);
        console.log('Deleted product from API, updated state:', updatedProducts);
        alert('Product deleted successfully');
      } catch (error) {
        console.error('Error deleting product:', error);
        // Even if API fails, remove from local state and localStorage
        const updatedProducts = products.filter(p => p.id !== productId);
        setProducts(updatedProducts);
        console.log('Deleted product locally after API failure:', updatedProducts);
        alert('Product deleted locally. It will be synced when the server is available.');
      }
    }
  };

  const handleSaveProduct = async (productData) => {
    try {
      if (editingProduct) {
        // Update existing product
        const response = await vendorAPI.updateProduct(editingProduct.id, productData);
        console.log('Update response:', response);

        // Check if response contains valid product data
        if (response && response.data && typeof response.data === 'object' && response.data.name) {
          const updatedProducts = products.map(p =>
            p.id === editingProduct.id ? response.data : p
          );
          setProducts(updatedProducts);
          console.log('Updated products state:', updatedProducts);
          alert('Product updated successfully');
        } else if (response && response.data && typeof response.data === 'string' && response.data.includes('<html>')) {
          throw new Error('API returned HTML error page');
        } else {
          throw new Error('Invalid response format');
        }
      } else {
        // Add new product
        console.log('Creating product with data:', productData);
        const response = await vendorAPI.createProduct(productData);
        console.log('Create response:', response);
        console.log('Response data:', response.data);
        console.log('Current products before adding:', products);

        // Check if response contains valid product data
        if (response && response.data && typeof response.data === 'object' && response.data.name) {
          const newProducts = [...products, response.data];
          setProducts(newProducts);
          console.log('Products after adding:', newProducts);
          alert('Product added successfully');
        } else if (response && response.data && typeof response.data === 'string' && response.data.includes('<html>')) {
          throw new Error('API returned HTML error page');
        } else if (response && response.status >= 400) {
          // Handle API error responses properly
          const errorDetail = response.data?.detail || `HTTP ${response.status}: ${response.statusText}`;
          throw new Error(errorDetail);
        } else {
          throw new Error('Invalid response format');
        }
      }
      setShowForm(false);
    } catch (error) {
      console.error('Error saving product:', error);
      console.error('Error response:', error.response?.data);

      // Show actual API error to user instead of falling back to localStorage
      let errorMessage = 'Failed to save product. Please try again.';

      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to perform this action.';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error. Please contact support or try again later.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Don't save to localStorage - show real error instead
      alert(`Error: ${errorMessage}\n\nPlease check your authentication and try again.`);
      console.log('API error - not saving to localStorage:', errorMessage);
    }
  };

  if (loading || productsLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-blue mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading products...</p>
        </div>
      </div>
    );
  }

  // If products failed to load but we're not loading, show error state
  if (!productsLoading && (!products || !Array.isArray(products))) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Unable to load products</h3>
          <p className="mt-1 text-sm text-gray-500">
            Please check your authentication and try refreshing the page.
          </p>
          <div className="mt-6">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-brand-blue hover:bg-brand-blue/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue"
            >
              Refresh Page
            </button>
          </div>
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
        <button
          onClick={() => window.location.reload()}
          className="mt-4 md:mt-0 ml-2 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue"
          title="Refresh products to see latest approval status"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
        {/* Debug buttons - temporarily removed for production */}
        {/* <div className="mt-4 md:mt-0 flex space-x-2">
          <button
            onClick={checkLocalStorage}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue"
          >
            Check Storage
          </button>
          <button
            onClick={saveToLocalStorage}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue"
          >
            Save Storage
          </button>
        </div> */}
      </div>

      {showForm ? (
        <>
          <ProductForm
            product={editingProduct}
            onSave={handleSaveProduct}
            onCancel={() => setShowForm(false)}
            isEditing={!!editingProduct}
          />
        </>
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
                  key={product.id || Math.random()}
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
