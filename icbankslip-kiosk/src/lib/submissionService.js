import { supabase } from './supabase'

export const findSubmissionByQRCode = async (qrcode) => {

  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('qrcode', qrcode)
    .maybeSingle()

  return {
    data,
    error
  }
}