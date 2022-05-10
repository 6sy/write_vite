<template>
{{title}}
</template>
<script>
 import {ref} from 'vue';
export default{
   setup(){
        const title = ref('你好')
        return {
            title
        }
   }
}
</script>
<style>
*{
    color:red;
}
</style>