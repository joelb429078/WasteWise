export const debugDb = async (supabase) => {
    try {
      // Test basic connection
      const { data: testData, error: testError } = await supabase
        .from('Users')
        .select('count')
        .single();
  
      if (testError) {
        console.error('Database connection test failed:', testError);
        return {
          success: false,
          error: testError
        };
      }
  
      // Get schema information
      const { data: schemaData, error: schemaError } = await supabase
        .rpc('get_schema_info');
  
      if (schemaError) {
        console.error('Schema query failed:', schemaError);
        return {
          success: false,
          error: schemaError
        };
      }
  
      return {
        success: true,
        data: {
          test: testData,
          schema: schemaData
        }
      };
    } catch (error) {
      console.error('Debug utility error:', error);
      return {
        success: false,
        error
      };
    }
  };
  