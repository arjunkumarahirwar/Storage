import { useCallback, useEffect, useState } from 'react'
import { prepareAvatar } from '../lib/avatar'
import { supabase } from '../lib/supabase'
import type { Profile } from '../lib/types'

export const USERNAME_PATTERN = /^[A-Za-z0-9._]{3,24}$/

export interface ProfileState {
  profile: Profile | null
  loading: boolean
  error: string | null
  /** True when a signed-in person still has to pick a username / picture. */
  needsSetup: boolean
  saveProfile: (input: { username: string; file: File | null }) => Promise<void>
  refresh: () => Promise<void>
}

export function useProfile(userId: string | null): ProfileState {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!userId) {
      setProfile(null)
      setError(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error: queryError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (queryError) {
      setError(queryError.message)
      setLoading(false)
      return
    }
    setError(null)
    setProfile((data ?? null) as Profile | null)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const saveProfile = useCallback(
    async ({ username, file }: { username: string; file: File | null }) => {
      if (!userId) throw new Error('Please sign in first.')

      const handle = username.trim().replace(/^@+/, '')
      if (!USERNAME_PATTERN.test(handle)) {
        throw new Error('Use 3–24 letters, numbers, dots or underscores — no spaces.')
      }
      if (!file && !profile?.avatar_url) {
        throw new Error('Please choose a profile picture.')
      }

      let avatarUrl = profile?.avatar_url ?? null

      if (file) {
        const blob = await prepareAvatar(file)
        const path = `${userId}/avatar-${Date.now()}.jpg`
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(path, blob, {
            contentType: 'image/jpeg',
            cacheControl: '31536000',
            upsert: true,
          })

        if (uploadError) {
          throw new Error(
            uploadError.message.includes('row-level security')
              ? 'The picture could not be uploaded — please sign in again and retry.'
              : uploadError.message,
          )
        }

        const { data: publicUrl } = supabase.storage.from('avatars').getPublicUrl(path)
        avatarUrl = publicUrl.publicUrl

        // Keep the folder to one file per person.
        try {
          const { data: existing } = await supabase.storage.from('avatars').list(userId)
          const stale = (existing ?? [])
            .map((entry) => `${userId}/${entry.name}`)
            .filter((entryPath) => entryPath !== path)
          if (stale.length) await supabase.storage.from('avatars').remove(stale)
        } catch {
          // A leftover file is harmless.
        }
      }

      if (!avatarUrl) throw new Error('Please choose a profile picture.')

      const { data, error: saveError } = await supabase
        .from('profiles')
        .upsert(
          { id: userId, username: handle, avatar_url: avatarUrl },
          { onConflict: 'id' },
        )
        .select('*')
        .single()

      if (saveError) {
        if (saveError.code === '23505' || /duplicate key|unique/i.test(saveError.message)) {
          throw new Error('That username is already taken — try another one.')
        }
        if (saveError.code === '23514' || /check constraint/i.test(saveError.message)) {
          throw new Error(
            /avatar/i.test(saveError.message)
              ? 'The picture link looks wrong. Please pick the photo again.'
              : 'Use 3–24 letters, numbers, dots or underscores — no spaces.',
          )
        }
        throw new Error(saveError.message)
      }

      setProfile(data as Profile)
    },
    [userId, profile],
  )

  const needsSetup =
    Boolean(userId) && !loading && (!profile?.username || !profile?.avatar_url)

  return { profile, loading, error, needsSetup, saveProfile, refresh }
}
