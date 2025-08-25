import React, { useEffect } from 'react';
import { supabase } from './api/supabaseClient';

function App() {
  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase.from('users').select('*');
      console.log(data, error);
    };
    fetchData();
  }, []);

  return <div className="text-center mt-10">Dashboard Frontend Connected!</div>;
}

export default App;
