'use client';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useFeatureRedirect } from '@/hooks/useFeatureRedirect';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useUploadMenuImagesMutation } from '@/lib/api/endpoints/menuItemsApi';
import {
  Room,
  useCreateRoomMutation,
  useDeleteRoomMutation,
  useGetRoomsQuery,
  useGetRoomStatsQuery,
  useUpdateRoomMutation,
  useUpdateRoomStatusMutation,
} from '@/lib/api/endpoints/roomsApi';
import { useAppSelector } from '@/lib/store';
import {
  PencilIcon,
  PhotoIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

export default function RoomsPage() {
  const { user, companyContext } = useAppSelector((state) => state.auth);
  
  useFeatureRedirect('room-management');
  
  const formatCurrency = useFormatCurrency();
  const { currency } = useCurrency();
  
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roomTypeFilter, setRoomTypeFilter] = useState('all');

  const branchId = (user as any)?.branchId || 
                   (companyContext as any)?.branchId || 
                   (companyContext as any)?.branches?.[0]?._id ||
                   (companyContext as any)?.branches?.[0]?.id;

  const { data: roomsResponse, isLoading } = useGetRoomsQuery({
    branchId,
    status: statusFilter === 'all' ? undefined : statusFilter,
  }, { 
    skip: !branchId,
    pollingInterval: 60000,
  });

  const { data: stats } = useGetRoomStatsQuery(branchId || '', {
    skip: !branchId,
  });

  const rooms = useMemo(() => {
    if (!roomsResponse) return [];
    const response = roomsResponse as any;
    let items = [];
    
    if (Array.isArray(response)) {
      items = response;
    } else if (response.data) {
      items = Array.isArray(response.data) ? response.data : response.data.rooms || [];
    } else {
      items = response.rooms || [];
    }
    
    return items.map((room: any) => ({
      id: room._id || room.id,
      roomNumber: room.roomNumber || '',
      roomType: room.roomType || 'double',
      floor: room.floor,
      building: room.building,
      description: room.description || '',
      maxOccupancy: room.maxOccupancy || 1,
      beds: room.beds || { single: 0, double: 0, king: 0 },
      amenities: room.amenities || [],
      basePrice: room.basePrice || 0,
      status: room.status || 'available',
      currentBookingId: room.currentBookingId,
      size: room.size,
      view: room.view,
      smokingAllowed: room.smokingAllowed || false,
      images: room.images || [],
      qrCode: room.qrCode,
      isActive: room.isActive !== false,
      createdAt: room.createdAt || new Date().toISOString(),
      updatedAt: room.updatedAt || new Date().toISOString(),
    })) as Room[];
  }, [roomsResponse]);

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const matchesSearch = 
        room.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (room.building && room.building.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesStatus = statusFilter === 'all' || room.status === statusFilter;
      const matchesType = roomTypeFilter === 'all' || room.roomType === roomTypeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [rooms, searchQuery, statusFilter, roomTypeFilter]);

  const [createRoom, { isLoading: isCreating }] = useCreateRoomMutation();
  const [updateRoom, { isLoading: isUpdating }] = useUpdateRoomMutation();
  const [deleteRoom] = useDeleteRoomMutation();
  const [updateRoomStatus] = useUpdateRoomStatusMutation();
  const [uploadImages] = useUploadMenuImagesMutation();

  const [formData, setFormData] = useState<any>({
    roomNumber: '',
    roomType: 'double',
    floor: '',
    building: '',
    description: '',
    maxOccupancy: 2,
    basePrice: 5000,
    beds: { single: 0, double: 1, king: 0 },
    amenities: [],
    size: '',
    view: '',
    smokingAllowed: false,
    images: [],
  });

  const resetForm = () => {
    setFormData({
      roomNumber: '',
      roomType: 'double',
      floor: '',
      building: '',
      description: '',
      maxOccupancy: 2,
      basePrice: 5000,
      beds: { single: 0, double: 1, king: 0 },
      amenities: [],
      size: '',
      view: '',
      smokingAllowed: false,
      images: [],
    });
    setSelectedRoom(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter((file) =>
      file.type.startsWith('image/')
    );

    if (imageFiles.length === 0) {
      toast.error('Please select valid image files');
      e.target.value = '';
      return;
    }

    // Validate file sizes (max 10MB per file)
    const maxSize = 10 * 1024 * 1024;
    const oversizedFiles = imageFiles.filter((file) => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      toast.error('Some files exceed 10MB limit');
      e.target.value = '';
      return;
    }

    try {
      const uploadFormData = new FormData();
      imageFiles.forEach((file) => {
        uploadFormData.append('images', file);
      });

      const result = await uploadImages(uploadFormData).unwrap();

      if (result.success && result.images && result.images.length > 0) {
        const imageUrls = result.images.map((img) => img.url);
        setFormData((prev: any) => ({
          ...prev,
          images: [...prev.images, ...imageUrls],
        }));
        toast.success(`Successfully uploaded ${result.images.length} image(s)`);
      } else {
        toast.error('Failed to upload images');
      }
    } catch (error: any) {
      console.error('Error uploading images:', error);
      toast.error(error?.data?.message || error?.message || 'Failed to upload images');
    }

    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_: any, i: number) => i !== index),
    });
  };

  const addAmenity = () => {
    const amenity = prompt('Enter amenity name:');
    if (amenity && amenity.trim()) {
      setFormData({
        ...formData,
        amenities: [...formData.amenities, amenity.trim()],
      });
    }
  };

  const removeAmenity = (index: number) => {
    setFormData({
      ...formData,
      amenities: formData.amenities.filter((_: any, i: number) => i !== index),
    });
  };

  useEffect(() => {
    if (!isCreateModalOpen && !isEditModalOpen) {
      resetForm();
    }
  }, [isCreateModalOpen, isEditModalOpen]);

  useEffect(() => {
    if (selectedRoom && isEditModalOpen) {
      setFormData({
        roomNumber: selectedRoom.roomNumber,
        roomType: selectedRoom.roomType,
        floor: selectedRoom.floor || '',
        building: selectedRoom.building || '',
        description: (selectedRoom as any).description || '',
        maxOccupancy: selectedRoom.maxOccupancy,
        basePrice: selectedRoom.basePrice,
        beds: selectedRoom.beds || { single: 0, double: 1, king: 0 },
        amenities: selectedRoom.amenities || [],
        size: selectedRoom.size || '',
        view: selectedRoom.view || '',
        smokingAllowed: selectedRoom.smokingAllowed || false,
        images: selectedRoom.images || [],
      });
    }
  }, [selectedRoom, isEditModalOpen]);

  const handleCreate = async () => {
    if (!formData.roomNumber || !formData.maxOccupancy || !formData.basePrice) {
      toast.error('Room number, max occupancy, and base price are required');
      return;
    }

    try {
      await createRoom({
        branchId: branchId || '',
        ...formData,
        floor: formData.floor ? Number(formData.floor) : undefined,
        size: formData.size ? Number(formData.size) : undefined,
      }).unwrap();
      toast.success('Room created successfully');
      setIsCreateModalOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to create room');
    }
  };

  const handleUpdate = async () => {
    if (!selectedRoom) return;

    try {
      await updateRoom({
        id: selectedRoom.id,
        ...formData,
        floor: formData.floor ? Number(formData.floor) : undefined,
        size: formData.size ? Number(formData.size) : undefined,
      }).unwrap();
      toast.success('Room updated successfully');
      setIsEditModalOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update room');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this room?')) return;

    try {
      await deleteRoom(id).unwrap();
      toast.success('Room deleted successfully');
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to delete room');
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await updateRoomStatus({ id, status }).unwrap();
      toast.success('Room status updated');
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update status');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info' | 'default'; label: string }> = {
      available: { variant: 'success', label: 'Available' },
      occupied: { variant: 'danger', label: 'Occupied' },
      reserved: { variant: 'warning', label: 'Reserved' },
      maintenance: { variant: 'info', label: 'Maintenance' },
      out_of_order: { variant: 'danger', label: 'Out of Order' },
    };

    const config = statusConfig[status] || { variant: 'default', label: status };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const columns = [
    {
      key: 'roomNumber',
      title: 'Room Number',
      sortable: true,
    },
    {
      key: 'roomType',
      title: 'Type',
      sortable: true,
      render: (value: string) => <span className="capitalize">{value}</span>,
    },
    {
      key: 'floor',
      title: 'Floor',
      render: (value: number) => value || '-',
    },
    {
      key: 'maxOccupancy',
      title: 'Max Occupancy',
      sortable: true,
    },
    {
      key: 'basePrice',
      title: 'Base Price',
      sortable: true,
      render: (value: number) => formatCurrency(value || 0),
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: string) => getStatusBadge(value),
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_: any, row: Room) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedRoom(row);
              setIsEditModalOpen(true);
            }}
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Select
            value={row.status}
            onChange={(value) => handleStatusChange(row.id, value)}
            options={[
              { value: 'available', label: 'Available' },
              { value: 'occupied', label: 'Occupied' },
              { value: 'reserved', label: 'Reserved' },
              { value: 'maintenance', label: 'Maintenance' },
              { value: 'out_of_order', label: 'Out of Order' },
            ]}
            className="w-32"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(row.id)}
          >
            <TrashIcon className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Room Management</h1>
          <p className="text-gray-600 mt-1">Manage hotel rooms and availability</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Room
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Total Rooms</div>
              <div className="text-2xl font-bold">{stats.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Available</div>
              <div className="text-2xl font-bold text-green-600">{stats.available || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Occupied</div>
              <div className="text-2xl font-bold text-red-600">{stats.occupied || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Reserved</div>
              <div className="text-2xl font-bold text-yellow-600">{stats.reserved || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Maintenance</div>
              <div className="text-2xl font-bold text-blue-600">{stats.maintenance || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Out of Order</div>
              <div className="text-2xl font-bold text-gray-600">{stats.outOfOrder || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-600">Occupancy Rate</div>
              <div className="text-2xl font-bold">{stats.occupancyRate || 0}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <Input
              placeholder="Search by room number or building..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Select
              value={statusFilter}
              onChange={(value) => setStatusFilter(value)}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'available', label: 'Available' },
                { value: 'occupied', label: 'Occupied' },
                { value: 'reserved', label: 'Reserved' },
                { value: 'maintenance', label: 'Maintenance' },
                { value: 'out_of_order', label: 'Out of Order' },
              ]}
              className="sm:min-w-[180px]"
            />
            <Select
              value={roomTypeFilter}
              onChange={(value) => setRoomTypeFilter(value)}
              options={[
                { value: 'all', label: 'All Types' },
                { value: 'single', label: 'Single' },
                { value: 'double', label: 'Double' },
                { value: 'suite', label: 'Suite' },
                { value: 'deluxe', label: 'Deluxe' },
                { value: 'presidential', label: 'Presidential' },
              ]}
              className="sm:min-w-[180px]"
            />
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={filteredRooms}
            columns={columns}
            loading={isLoading}
            exportOptions={{
              filename: 'rooms',
              columns: [
                { key: 'roomNumber', label: 'Room Number' },
                { key: 'roomType', label: 'Type' },
                { key: 'floor', label: 'Floor' },
                { key: 'maxOccupancy', label: 'Max Occupancy' },
                { key: 'basePrice', label: 'Base Price', format: (val) => formatCurrency(Number(val) || 0) },
                { key: 'status', label: 'Status' },
              ],
            }}
          />
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Room"
        size="lg"
      >
        <div className="space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Room Number *</label>
              <Input
                value={formData.roomNumber}
                onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                placeholder="101"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Room Type *</label>
              <Select
                value={formData.roomType}
                onChange={(value) => setFormData({ ...formData, roomType: value })}
                options={[
                  { value: 'single', label: 'Single' },
                  { value: 'double', label: 'Double' },
                  { value: 'suite', label: 'Suite' },
                  { value: 'deluxe', label: 'Deluxe' },
                  { value: 'presidential', label: 'Presidential' },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Floor</label>
              <Input
                type="number"
                value={formData.floor}
                onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                placeholder="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Building</label>
              <Input
                value={formData.building}
                onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                placeholder="Main Building"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Occupancy *</label>
              <Input
                type="number"
                value={formData.maxOccupancy}
                onChange={(e) => setFormData({ ...formData, maxOccupancy: Number(e.target.value) })}
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Base Price ({currency}) *</label>
              <Input
                type="number"
                value={formData.basePrice}
                onChange={(e) => setFormData({ ...formData, basePrice: Number(e.target.value) })}
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Size (sq ft/m²)</label>
              <Input
                type="number"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                placeholder="250"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">View</label>
              <Input
                value={formData.view}
                onChange={(e) => setFormData({ ...formData, view: e.target.value })}
                placeholder="Ocean, Mountain, City, Garden"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Room description and features..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Beds Configuration</label>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Single Beds</label>
                <Input
                  type="number"
                  value={formData.beds.single}
                  onChange={(e) => setFormData({
                    ...formData,
                    beds: { ...formData.beds, single: Number(e.target.value) || 0 }
                  })}
                  min="0"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Double Beds</label>
                <Input
                  type="number"
                  value={formData.beds.double}
                  onChange={(e) => setFormData({
                    ...formData,
                    beds: { ...formData.beds, double: Number(e.target.value) || 0 }
                  })}
                  min="0"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">King Beds</label>
                <Input
                  type="number"
                  value={formData.beds.king}
                  onChange={(e) => setFormData({
                    ...formData,
                    beds: { ...formData.beds, king: Number(e.target.value) || 0 }
                  })}
                  min="0"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Amenities</label>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addAmenity}
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.amenities.map((amenity: string, index: number) => (
                <Badge key={index} variant="info" className="flex items-center gap-1">
                  {amenity}
                  <button
                    type="button"
                    onClick={() => removeAmenity(index)}
                    className="ml-1 hover:text-red-500"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {formData.amenities.length === 0 && (
                <span className="text-sm text-gray-500">No amenities added</span>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="smokingAllowed"
                checked={formData.smokingAllowed}
                onChange={(e) => setFormData({ ...formData, smokingAllowed: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="smokingAllowed" className="text-sm font-medium">
                Smoking Allowed
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Room Images</label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <span className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer">
                    <PhotoIcon className="h-4 w-4 mr-2" />
                    Upload Images
                  </span>
                </label>
                <span className="text-xs text-gray-500">Max 10MB per image</span>
              </div>
              {formData.images.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {formData.images.map((image: string, index: number) => (
                    <div key={index} className="relative group">
                      <img
                        src={image}
                        alt={`Room ${index + 1}`}
                        className="w-full h-24 object-cover rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isCreating}>
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Room"
        size="lg"
      >
        <div className="space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Room Number *</label>
              <Input
                value={formData.roomNumber}
                onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Room Type *</label>
              <Select
                value={formData.roomType}
                onChange={(value) => setFormData({ ...formData, roomType: value })}
                options={[
                  { value: 'single', label: 'Single' },
                  { value: 'double', label: 'Double' },
                  { value: 'suite', label: 'Suite' },
                  { value: 'deluxe', label: 'Deluxe' },
                  { value: 'presidential', label: 'Presidential' },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Floor</label>
              <Input
                type="number"
                value={formData.floor}
                onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Building</label>
              <Input
                value={formData.building}
                onChange={(e) => setFormData({ ...formData, building: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Max Occupancy *</label>
              <Input
                type="number"
                value={formData.maxOccupancy}
                onChange={(e) => setFormData({ ...formData, maxOccupancy: Number(e.target.value) })}
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Base Price ({currency}) *</label>
              <Input
                type="number"
                value={formData.basePrice}
                onChange={(e) => setFormData({ ...formData, basePrice: Number(e.target.value) })}
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Size (sq ft/m²)</label>
              <Input
                type="number"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                placeholder="250"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">View</label>
              <Input
                value={formData.view}
                onChange={(e) => setFormData({ ...formData, view: e.target.value })}
                placeholder="Ocean, Mountain, City, Garden"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Room description and features..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Beds Configuration</label>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Single Beds</label>
                <Input
                  type="number"
                  value={formData.beds.single}
                  onChange={(e) => setFormData({
                    ...formData,
                    beds: { ...formData.beds, single: Number(e.target.value) || 0 }
                  })}
                  min="0"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Double Beds</label>
                <Input
                  type="number"
                  value={formData.beds.double}
                  onChange={(e) => setFormData({
                    ...formData,
                    beds: { ...formData.beds, double: Number(e.target.value) || 0 }
                  })}
                  min="0"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">King Beds</label>
                <Input
                  type="number"
                  value={formData.beds.king}
                  onChange={(e) => setFormData({
                    ...formData,
                    beds: { ...formData.beds, king: Number(e.target.value) || 0 }
                  })}
                  min="0"
                />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium">Amenities</label>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addAmenity}
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.amenities.map((amenity: string, index: number) => (
                <Badge key={index} variant="info" className="flex items-center gap-1">
                  {amenity}
                  <button
                    type="button"
                    onClick={() => removeAmenity(index)}
                    className="ml-1 hover:text-red-500"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {formData.amenities.length === 0 && (
                <span className="text-sm text-gray-500">No amenities added</span>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="smokingAllowedEdit"
                checked={formData.smokingAllowed}
                onChange={(e) => setFormData({ ...formData, smokingAllowed: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <label htmlFor="smokingAllowedEdit" className="text-sm font-medium">
                Smoking Allowed
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Room Images</label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <span className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer">
                    <PhotoIcon className="h-4 w-4 mr-2" />
                    Upload Images
                  </span>
                </label>
                <span className="text-xs text-gray-500">Max 10MB per image</span>
              </div>
              {formData.images.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {formData.images.map((image: string, index: number) => (
                    <div key={index} className="relative group">
                      <img
                        src={image}
                        alt={`Room ${index + 1}`}
                        className="w-full h-24 object-cover rounded border"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <XMarkIcon className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={isUpdating}>
              {isUpdating ? 'Updating...' : 'Update'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

