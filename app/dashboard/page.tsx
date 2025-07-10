"use client"

import { useState, useEffect } from "react"
import { Calendar, Heart, Gift, Settings, Bell, Lock, Plus, Edit2, Camera, ArrowLeft, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { SpouseProfile, CustomField, Reminder } from "@/lib/types"
import { downloadICS } from "@/lib/utils"

export default function DashboardPage() {
  const { user, signOut, loading } = useAuth()
  const router = useRouter()
  
  const [profile, setProfile] = useState<SpouseProfile | null>(null)
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [newField, setNewField] = useState({ category: "clothing" as "clothing" | "favorites" | "places" | "gifts" | "health", label: "", value: "" })

  const [reminders, setReminders] = useState<Reminder[]>([])

  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  const [newReminder, setNewReminder] = useState({
    title: "",
    type: "custom",
    date: "",
    advance_notice_days: 7,
    enabled: true,
    notes: ""
  })
  const [isAddingReminder, setIsAddingReminder] = useState(false)
  const [isSavingReminder, setIsSavingReminder] = useState(false)

  // Fetch data on component mount
  useEffect(() => {
    if (user && !loading) {
      fetchData()
    }
  }, [user, loading])

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth')
    }
  }, [user, loading, router])

  const fetchData = async () => {
    try {
      const token = await getAuthToken()
      if (!token) return

      // Fetch profile
      const profileResponse = await fetch('/api/spouse-profiles', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (profileResponse.ok) {
        const profileData = await profileResponse.json()
        setProfile(profileData.data)
      }

      // Fetch custom fields
      const fieldsResponse = await fetch('/api/custom-fields', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (fieldsResponse.ok) {
        const fieldsData = await fieldsResponse.json()
        setCustomFields(fieldsData.data || [])
      }

      // Fetch reminders
      const remindersResponse = await fetch('/api/reminders', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (remindersResponse.ok) {
        const remindersData = await remindersResponse.json()
        setReminders(remindersData.data || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getAuthToken = async () => {
    try {
      const { data: { session } } = await import('@/lib/supabaseClient').then(m => m.supabase.auth.getSession())
      console.log('Session:', session ? 'exists' : 'null')
      return session?.access_token
    } catch (error) {
      console.error('Error getting auth token:', error)
      return null
    }
  }

  const calculateDaysUntil = (dateString: string) => {
    if (!dateString) return 0
    const today = new Date()
    const targetDate = new Date(dateString)
    const currentYear = today.getFullYear()

    // Set the target date to this year
    targetDate.setFullYear(currentYear)

    // If the date has already passed this year, set it to next year
    if (targetDate < today) {
      targetDate.setFullYear(currentYear + 1)
    }

    const diffTime = targetDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const groupedFields = customFields.reduce(
    (acc, field) => {
      if (!acc[field.category]) {
        acc[field.category] = []
      }
      acc[field.category].push(field)
      return acc
    },
    {} as Record<string, CustomField[]>,
  )

  const saveProfile = async (profileData: any) => {
    setIsSaving(true)
    try {
      const token = await getAuthToken()
      if (!token) return

      const response = await fetch('/api/spouse-profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ...profileData,
          photo_url: profile?.photo_url || profileData.photo_url
        })
      })

      if (response.ok) {
        const savedProfile = await response.json()
        setProfile(savedProfile)
        setIsEditingProfile(false)
        fetchData()
      } else {
        const errorData = await response.json()
        alert('Error saving profile: ' + (errorData.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Error saving profile: ' + error)
    } finally {
      setIsSaving(false)
    }
  }

  const addCustomField = async () => {
    if (!newField.category || !newField.label || !newField.value) {
      alert('Please fill in all fields')
      return
    }
    
    if (!profile) {
      alert('Please create a partner profile first')
      return
    }
    
    try {
      const token = await getAuthToken()
      if (!token) return

      console.log('Adding custom field:', {
        profile_id: profile.id,
        category: newField.category,
        label: newField.label,
        value: newField.value
      })

      const response = await fetch('/api/custom-fields', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          profile_id: profile.id,
          category: newField.category,
          label: newField.label,
          value: newField.value
        })
      })

      if (response.ok) {
        const data = await response.json()
        console.log('Custom field added successfully:', data)
        setCustomFields([...customFields, data.data])
        setNewField({ category: "clothing", label: "", value: "" })
      } else {
        const errorData = await response.json()
        console.error('Error adding custom field:', errorData)
        alert('Error adding field: ' + (errorData.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error adding field:', error)
      alert('Error adding field: ' + error)
    }
  }

  const deleteField = async (id: string) => {
    try {
      const token = await getAuthToken()
      if (!token) return

      const response = await fetch(`/api/custom-fields?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        setCustomFields(customFields.filter((field) => field.id !== id))
      }
    } catch (error) {
      console.error('Error deleting field:', error)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadImage = async () => {
    if (!selectedImage) return
    
    setIsUploadingImage(true)
    try {
      const token = await getAuthToken()
      if (!token) return

      const formData = new FormData()
      formData.append('file', selectedImage)

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        setProfile(prev => prev ? { ...prev, photo_url: data.url } : { photo_url: data.url, id: "", user_id: "", name: "", created_at: "", updated_at: "" })
        setSelectedImage(null)
        setImagePreview(null)
      } else {
        const errorData = await response.json()
        alert('Error uploading image: ' + (errorData.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Error uploading image: ' + error)
    } finally {
      setIsUploadingImage(false)
    }
  }

  const deleteReminder = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reminder?')) return
    
    try {
      const token = await getAuthToken()
      if (!token) return

      const response = await fetch(`/api/reminders?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        setReminders(reminders.filter(r => r.id !== id))
      } else {
        const errorData = await response.json()
        alert('Error deleting reminder: ' + (errorData.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error deleting reminder:', error)
      alert('Error deleting reminder: ' + error)
    }
  }

  const addReminder = async () => {
    if (!newReminder.title || !newReminder.date) return

    setIsSavingReminder(true)
    try {
      const token = await getAuthToken()
      if (!token) return

      // Use the existing profile ID from the profile state
      if (!profile?.id) {
        alert('Please create a spouse profile first before adding reminders')
        setIsSavingReminder(false)
        return
      }

      const response = await fetch('/api/reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          profile_id: profile.id, // Use the actual profile ID
          type: newReminder.type,
          title: newReminder.title,
          date: newReminder.date,
          enabled: newReminder.enabled,
          advance_notice_days: newReminder.advance_notice_days,
          notes: newReminder.notes
        })
      })

      if (response.ok) {
        const result = await response.json()
        setReminders([...reminders, result.data])
        setNewReminder({
          title: "",
          type: "custom",
          date: "",
          advance_notice_days: 7,
          enabled: true,
          notes: ""
        })
        setIsAddingReminder(false)
      } else {
        const errorData = await response.json()
        alert('Error creating reminder: ' + (errorData.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error creating reminder:', error)
      alert('Error creating reminder: ' + error)
    } finally {
      setIsSavingReminder(false)
    }
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-4 font-system">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mr-4">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Heart className="h-8 w-8 text-pink-500" />
            <h1 className="text-2xl font-bold text-gray-900">My Partner</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/reminders">
              <Button variant="outline" size="sm">
                <Bell className="h-4 w-4 mr-2" />
                Reminders
              </Button>
            </Link>
            <Button variant="outline" size="sm">
              <Lock className="h-4 w-4 mr-2" />
              Security
            </Button>
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Debug Info */}
        {process.env.NODE_ENV === 'development' && (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4">
              <h3 className="font-semibold text-yellow-800 mb-2">Debug Info</h3>
              <div className="text-sm text-yellow-700 space-y-1">
                <p>User: {user?.email || 'Not logged in'}</p>
                <p>Profile: {profile ? 'Exists' : 'Not created'}</p>
                <p>Custom Fields: {customFields.length}</p>
                <p>Loading: {isLoading ? 'Yes' : 'No'}</p>
              </div>
              <div className="mt-3 space-x-2">
                <Button size="sm" variant="outline" onClick={() => fetchData()}>
                  Refresh Data
                </Button>
                <Button size="sm" variant="outline" onClick={async () => {
                  const token = await getAuthToken()
                  console.log('Current token:', token ? 'exists' : 'null')
                }}>
                  Check Token
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile Card */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={profile?.photo_url || imagePreview || "/placeholder.svg"} alt={profile?.name || "Partner"} />
                    <AvatarFallback className="text-lg">
                      {profile?.name
                        ? profile.name.split(" ").map((n) => n[0]).join("")
                        : "P"}
                    </AvatarFallback>
                  </Avatar>
                  <label htmlFor="image-upload" className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0 bg-white border-2 border-gray-300 hover:border-pink-500 cursor-pointer flex items-center justify-center">
                    <Camera className="h-4 w-4 text-gray-600" />
                  </label>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </div>
                <div>
                  {profile?.display_nickname && profile?.nickname ? (
                    <>
                      <h2 className="text-2xl font-bold text-gray-900">{profile.nickname}</h2>
                      <span className="text-sm text-gray-500 ml-2">{profile.name}</span>
                    </>
                  ) : (
                    <>
                      <h2 className="text-2xl font-semibold text-gray-900">{profile?.name || "Add Partner Details"}</h2>
                      {profile?.nickname && (
                        <span className="text-sm text-gray-500 ml-2">{profile.nickname}</span>
                      )}
                    </>
                  )}
                  <p className="text-gray-600 mt-1">{profile?.notes || "Click 'Edit Profile' to get started"}</p>
                </div>
              </div>
              <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Edit2 className="h-4 w-4 mr-2" />
                    {profile ? "Edit Profile" : "Add Profile"}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{profile ? "Edit Profile" : "Add Partner Profile"}</DialogTitle>
                    <DialogDescription>Update your partner's basic information</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    {/* Image Upload Section */}
                    <div className="space-y-2">
                      <Label>Profile Picture</Label>
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={profile?.photo_url || imagePreview || "/placeholder.svg"} alt="Profile" />
                          <AvatarFallback>P</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-2">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageSelect}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-pink-50 file:text-pink-700 hover:file:bg-pink-100"
                          />
                          {selectedImage && (
                            <Button 
                              onClick={uploadImage} 
                              disabled={isUploadingImage}
                              size="sm"
                              className="w-full"
                            >
                              {isUploadingImage ? "Uploading..." : "Upload Image"}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        value={profile?.name || ""}
                        onChange={(e) => setProfile(prev => prev ? { ...prev, name: e.target.value } : { name: e.target.value, id: "", user_id: "", created_at: "", updated_at: "" })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="nickname">Nickname</Label>
                      <Input
                        id="nickname"
                        value={profile?.nickname || ""}
                        onChange={(e) => setProfile(prev => prev ? { ...prev, nickname: e.target.value } : { nickname: e.target.value, name: "", id: "", user_id: "", created_at: "", updated_at: "" })}
                        placeholder="e.g. Honey, Babe, etc."
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        id="display_nickname"
                        type="checkbox"
                        checked={!!profile?.display_nickname}
                        onChange={e => setProfile(prev => prev ? { ...prev, display_nickname: e.target.checked } : { display_nickname: e.target.checked, name: "", id: "", user_id: "", created_at: "", updated_at: "" })}
                        className="accent-pink-500"
                      />
                      <Label htmlFor="display_nickname">Display nickname instead</Label>
                    </div>
                    <div>
                      <Label htmlFor="birthday">Birthday</Label>
                      <Input
                        id="birthday"
                        type="date"
                        value={profile?.birthday || ""}
                        onChange={(e) => setProfile(prev => prev ? { ...prev, birthday: e.target.value } : { birthday: e.target.value, id: "", user_id: "", name: "", created_at: "", updated_at: "" })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="anniversary">Anniversary</Label>
                      <Input
                        id="anniversary"
                        type="date"
                        value={profile?.anniversary || ""}
                        onChange={(e) => setProfile(prev => prev ? { ...prev, anniversary: e.target.value } : { anniversary: e.target.value, id: "", user_id: "", name: "", created_at: "", updated_at: "" })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={profile?.notes || ""}
                        onChange={(e) => setProfile(prev => prev ? { ...prev, notes: e.target.value } : { notes: e.target.value, id: "", user_id: "", name: "", created_at: "", updated_at: "" })}
                        placeholder="Personal reminders about your partner..."
                      />
                    </div>
                    <Button 
                      onClick={() => {
                        const profileData = {
                          name: profile?.name || "",
                          birthday: profile?.birthday || undefined,
                          anniversary: profile?.anniversary || undefined,
                          notes: profile?.notes || "",
                          nickname: profile?.nickname || undefined,
                          display_nickname: !!profile?.display_nickname,
                          photo_url: profile?.photo_url || undefined
                        }
                        saveProfile(profileData)
                      }} 
                      className="w-full" 
                      disabled={isSaving}
                    >
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 bg-pink-50 rounded-lg">
                <Calendar className="h-5 w-5 text-pink-600" />
                <div>
                  <p className="text-sm text-gray-600">Birthday</p>
                  <p className="font-semibold">{profile?.birthday ? `${calculateDaysUntil(profile.birthday)} days away` : "Not set"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                <Heart className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Anniversary</p>
                  <p className="font-semibold">{profile?.anniversary ? `${calculateDaysUntil(profile.anniversary)} days away` : "Not set"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <Gift className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Gift Ideas</p>
                  <p className="font-semibold">{groupedFields["gifts"]?.length || 0} saved</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details Tabs */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Details & Information</CardTitle>
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Detail
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Detail</DialogTitle>
                    <DialogDescription>Add a new piece of information about your partner</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select
                        value={newField.category}
                        onValueChange={(value) => setNewField({ ...newField, category: value as "clothing" | "favorites" | "places" | "gifts" | "health" })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="clothing">Clothing</SelectItem>
                          <SelectItem value="favorites">Favorites</SelectItem>
                          <SelectItem value="places">Important Places</SelectItem>
                          <SelectItem value="gifts">Gift Ideas</SelectItem>
                          <SelectItem value="health">Health</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="label">Label</Label>
                      <Input
                        id="label"
                        value={newField.label}
                        onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                        placeholder="e.g., Favorite Color"
                      />
                    </div>
                    <div>
                      <Label htmlFor="value">Value</Label>
                      <Input
                        id="value"
                        value={newField.value}
                        onChange={(e) => setNewField({ ...newField, value: e.target.value })}
                        placeholder="e.g., Blue"
                      />
                    </div>
                    <Button onClick={addCustomField} className="w-full">
                      Add Detail
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="clothing">Clothing</TabsTrigger>
                <TabsTrigger value="favorites">Favorites</TabsTrigger>
                <TabsTrigger value="places">Places</TabsTrigger>
                <TabsTrigger value="gifts">Gifts</TabsTrigger>
                <TabsTrigger value="health">Health</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4">
                {Object.entries(groupedFields).map(([category, fields]) => (
                  <div key={category}>
                    <h3 className="font-semibold text-lg mb-3 text-gray-800">{category}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {fields.map((field) => (
                        <div
                          key={field.id}
                          className="p-3 bg-gray-50 rounded-lg border group hover:bg-gray-100 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm text-gray-600">{field.label}</p>
                              <p className="font-medium text-gray-900">{field.value}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteField(field.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                            >
                              ×
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </TabsContent>

              {Object.entries(groupedFields).map(([category, fields]) => (
                <TabsContent key={category} value={category} className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {fields.map((field) => (
                      <div
                        key={field.id}
                        className="p-3 bg-gray-50 rounded-lg border group hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm text-gray-600">{field.label}</p>
                            <p className="font-medium text-gray-900">{field.value}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteField(field.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>

        {/* Reminders Card */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Upcoming Reminders</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {reminders.length === 0 ? (
              <div className="text-center text-gray-500">No reminders set. <Link href="/reminders" className="text-pink-500 underline">Add one</Link>.</div>
            ) : (
              reminders.map(reminder => (
                <div key={reminder.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                  <div>
                    <div className="font-semibold text-gray-900">{reminder.title}</div>
                    <div className="text-sm text-gray-600">{new Date(reminder.date).toLocaleDateString()} ({reminder.type})</div>
                    {reminder.notes && <div className="text-xs text-gray-500 mt-1">{reminder.notes}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => downloadICS({
                        title: reminder.title,
                        date: reminder.date,
                        notes: reminder.notes
                      })}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Calendar className="h-4 w-4 mr-1" />
                      Save to Calendar
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => deleteReminder(reminder.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/reminders">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <Bell className="h-8 w-8 text-blue-500 mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Set Reminders</h3>
                <p className="text-sm text-gray-600">Get notified about important dates and events</p>
              </CardContent>
            </Card>
          </Link>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <Gift className="h-8 w-8 text-green-500 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Gift Planner</h3>
              <p className="text-sm text-gray-600">Plan surprises and track gift ideas</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <Lock className="h-8 w-8 text-purple-500 mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Privacy Settings</h3>
              <p className="text-sm text-gray-600">Secure your data with PIN or biometric lock</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
