import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({path: './.env'})
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)
async function run() {
  const { data } = await supabase.from('cities').select('*').limit(1)
  console.log(JSON.stringify(data, null, 2))
}
run()
