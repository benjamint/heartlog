"use client"

import { useState, useEffect } from "react"
import { Bell, Calendar, Gift, Heart, Plus, Trash2, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { supabase } from "@/lib/supabaseClient"


import { downloadICS } from "@/lib/utils"

interface Reminder {
  id: string;
  user_id: string;
  profile_id: string;
  title: string;
  type: "birthday" | "anniversary" | "custom";
  date: string;
  advance_notice_days: number;
  enabled: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export default function RemindersPage() {
  const { user } = useAuth()
  const [reminders, setReminders] = useState<Reminder[]>([])
  // Fetch partner profile and check for birthday
  const [partnerProfile, setPartnerProfile] = useState<any>(null)
  const [partnerBirthday, setPartnerBirthday] = useState<string | null>(null)

  // Fetch partner profile
  const fetchPartnerProfile = async () => {
    try {
      const token = await getAuthToken()
      if (!token) return

      const response = await fetch('/api/spouse-profiles', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const result = await response.json()
        const profile = result.data || result
        setPartnerProfile(profile)
        if (profile && profile.birthday) {
          setPartnerBirthday(profile.birthday)
        } else {
          setPartnerBirthday(null)
        }
      } else {
        setPartnerProfile(null)
        setPartnerBirthday(null)
      }
    } catch (error) {
      setPartnerProfile(null)
      setPartnerBirthday(null)
    }
  }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [newReminder, setNewReminder] = useState<Partial<Reminder>>({
    title: "",
    type: "custom",
    date: "",
    advance_notice_days: 7,
    enabled: true,
    notes: ""
  })

  const [isAddingReminder, setIsAddingReminder] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Fetch reminders from API
  const fetchReminders = async () => {
    try {
      setLoading(true)
      const token = await getAuthToken()
      if (!token) return

      const response = await fetch('/api/reminders', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        const result = await response.json()
        setReminders(result.data || [])
      } else {
        const errorData = await response.json()
        setError('Failed to fetch reminders: ' + (errorData.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error fetching reminders:', error)
      setError('Failed to fetch reminders')
    } finally {
      setLoading(false)
    }
  }

  // Get auth token helper
  const getAuthToken = async () => {
    if (!user) return null
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

  useEffect(() => {
    if (user) {
      fetchReminders()
      fetchPartnerProfile()
    }
  }, [user])

  const addReminder = async () => {
    if (!newReminder.title || !newReminder.date) return

    setIsSaving(true)
    try {
      const token = await getAuthToken()
      if (!token) return

      // First, get the user's profile to get the correct profile_id
      const profileResponse = await fetch('/api/spouse-profiles', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!profileResponse.ok) {
        alert('Please create a spouse profile first before adding reminders')
        setIsSaving(false)
        return
      }

      const profileResult = await profileResponse.json()
      const profile = profileResult.data || profileResult // Handle both response formats

      if (!profile) {
        alert('Please create a spouse profile first before adding reminders')
        setIsSaving(false)
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
      setIsSaving(false)
    }
  }

  const toggleReminder = async (id: string) => {
    const reminder = reminders.find(r => r.id === id)
    if (!reminder) return

    try {
      const token = await getAuthToken()
      if (!token) return

      const response = await fetch('/api/reminders', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          id: reminder.id,
          type: reminder.type,
          title: reminder.title,
          date: reminder.date,
          enabled: !reminder.enabled,
          advance_notice_days: reminder.advance_notice_days,
          notes: reminder.notes
        })
      })

      if (response.ok) {
        const result = await response.json()
        setReminders(reminders.map(r => r.id === id ? result.data : r))
      } else {
        const errorData = await response.json()
        alert('Error updating reminder: ' + (errorData.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error updating reminder:', error)
      alert('Error updating reminder: ' + error)
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "birthday":
        return <Gift className="h-4 w-4" />
      case "anniversary":
        return <Heart className="h-4 w-4" />
      default:
        return <Calendar className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "birthday":
        return "bg-blue-100 text-blue-800"
      case "anniversary":
        return "bg-pink-100 text-pink-800"
      default:
        return "bg-purple-100 text-purple-800"
    }
  }

  const addQuickReminder = async (title: string, date: string, type: "birthday" | "anniversary" | "custom") => {
    // Prevent adding duplicate reminders (by title, date, and type)
    const alreadyExists = reminders.some(
      (r) => r.title === title && r.date === date && r.type === type
    )
    if (alreadyExists) return

    setIsSaving(true)
    try {
      const token = await getAuthToken()
      if (!token) return

      // First, get the user's profile to get the correct profile_id
      const profileResponse = await fetch('/api/spouse-profiles', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!profileResponse.ok) {
        alert('Please create a spouse profile first before adding reminders')
        setIsSaving(false)
        return
      }

      const profileResult = await profileResponse.json()
      const profile = profileResult.data || profileResult

      if (!profile) {
        alert('Please create a spouse profile first before adding reminders')
        setIsSaving(false)
        return
      }

      const response = await fetch('/api/reminders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          profile_id: profile.id,
          type: type,
          title: title,
          date: date,
          enabled: true,
          advance_notice_days: 7,
          notes: `Quick reminder for ${title}`
        })
      })

      if (response.ok) {
        const result = await response.json()
        setReminders([...reminders, result.data])
        // Removed success alert
      } else {
        const errorData = await response.json()
        alert('Error creating reminder: ' + (errorData.error || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error creating reminder:', error)
      alert('Error creating reminder: ' + error)
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-4 font-system">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8">
            <p>Loading reminders...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-4 font-system">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-8 text-red-600">
            <p>Error: {error}</p>
            <Button onClick={fetchReminders} className="mt-4">Retry</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 p-4 font-system">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mr-4"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Bell className="h-8 w-8 text-pink-500" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Reminders</h1>
              <p className="text-gray-600">Never miss an important moment</p>
            </div>
          </div>
          <Dialog open={isAddingReminder} onOpenChange={setIsAddingReminder}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Reminder
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Reminder</DialogTitle>
                <DialogDescription>Set up a new reminder for important dates</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newReminder.title}
                    onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                    placeholder="e.g., Valentine's Day"
                  />
                </div>
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Select
                    value={newReminder.type}
                    onValueChange={(value) => setNewReminder({ ...newReminder, type: value as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="birthday">Birthday</SelectItem>
                      <SelectItem value="anniversary">Anniversary</SelectItem>
                      <SelectItem value="custom">Custom Event</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={newReminder.date}
                    onChange={(e) => setNewReminder({ ...newReminder, date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="advance">Remind me (days in advance)</Label>
                  <Select
                    value={newReminder.advance_notice_days?.toString()}
                    onValueChange={(value) => setNewReminder({ ...newReminder, advance_notice_days: Number.parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 day</SelectItem>
                      <SelectItem value="3">3 days</SelectItem>
                      <SelectItem value="7">1 week</SelectItem>
                      <SelectItem value="14">2 weeks</SelectItem>
                      <SelectItem value="30">1 month</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="notes">Notes (optional)</Label>
                  <Input
                    id="notes"
                    value={newReminder.notes || ""}
                    onChange={(e) => setNewReminder({ ...newReminder, notes: e.target.value })}
                    placeholder="Additional notes..."
                  />
                </div>
                <Button onClick={addReminder} className="w-full" disabled={isSaving}>
                  {isSaving ? "Creating..." : "Create Reminder"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Active Reminders */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Active Reminders</CardTitle>
            <CardDescription>Your upcoming notifications and alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {reminders
              .filter((r) => r.enabled)
              .map((reminder) => (
                <div key={reminder.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-full ${getTypeColor(reminder.type)}`}>
                      {getTypeIcon(reminder.type)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{reminder.title}</h3>
                      <p className="text-sm text-gray-600">
                        {new Date(reminder.date).toLocaleDateString()} • {reminder.advance_notice_days} days advance
                      </p>
                      {reminder.notes && (
                        <p className="text-xs text-gray-500 mt-1">{reminder.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={reminder.enabled} onCheckedChange={() => toggleReminder(reminder.id)} />
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
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteReminder(reminder.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            {reminders.filter((r) => r.enabled).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No active reminders</p>
                <p className="text-sm">Create your first reminder to get started</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Disabled Reminders */}
        {reminders.filter((r) => !r.enabled).length > 0 && (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <CardTitle>Disabled Reminders</CardTitle>
              <CardDescription>Reminders that are currently turned off</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {reminders
                .filter((r) => !r.enabled)
                .map((reminder) => (
                  <div
                    key={reminder.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border opacity-60"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${getTypeColor(reminder.type)}`}>
                        {getTypeIcon(reminder.type)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{reminder.title}</h3>
                        <p className="text-sm text-gray-600">
                          {new Date(reminder.date).toLocaleDateString()} • {reminder.advance_notice_days} days advance
                        </p>
                        {reminder.notes && (
                          <p className="text-xs text-gray-500 mt-1">{reminder.notes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch checked={reminder.enabled} onCheckedChange={() => toggleReminder(reminder.id)} />
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteReminder(reminder.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
            </CardContent>
          </Card>
        )}

        {/* Quick Setup */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>Quick Setup</CardTitle>
            <CardDescription>Common reminders you might want to add</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Partner's Birthday from profile if set */}
              {partnerBirthday && (
                <Button
                  variant="outline"
                  className="h-auto p-4 flex flex-col items-center gap-2 bg-transparent"
                  onClick={() => addQuickReminder("Partner's Birthday", partnerBirthday, "birthday")}
                  disabled={isSaving || reminders.some(r => r.title === "Partner's Birthday" && r.date === partnerBirthday && r.type === "birthday")}
                >
                  <Gift className="h-6 w-6 text-blue-500" />
                  <span className="font-medium">Partner's Birthday</span>
                  <span className="text-xs text-gray-500">{new Date(partnerBirthday).toLocaleDateString()}</span>
                </Button>
              )}
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col items-center gap-2 bg-transparent"
                onClick={() => addQuickReminder("Valentine's Day", "2025-02-14", "custom")}
                disabled={isSaving || reminders.some(r => r.title === "Valentine's Day" && r.date === "2025-02-14" && r.type === "custom")}
              >
                <Heart className="h-6 w-6 text-pink-500" />
                <span className="font-medium">Valentine's Day</span>
                <span className="text-xs text-gray-500">February 14th</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col items-center gap-2 bg-transparent"
                onClick={() => addQuickReminder("Christmas", "2025-12-25", "custom")}
                disabled={isSaving || reminders.some(r => r.title === "Christmas" && r.date === "2025-12-25" && r.type === "custom")}
              >
                <Gift className="h-6 w-6 text-blue-500" />
                <span className="font-medium">Christmas</span>
                <span className="text-xs text-gray-500">December 25th</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col items-center gap-2 bg-transparent"
                onClick={() => addQuickReminder("New Year", "2026-01-01", "custom")}
                disabled={isSaving || reminders.some(r => r.title === "New Year" && r.date === "2026-01-01" && r.type === "custom")}
              >
                <Calendar className="h-6 w-6 text-purple-500" />
                <span className="font-medium">New Year</span>
                <span className="text-xs text-gray-500">January 1st</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
