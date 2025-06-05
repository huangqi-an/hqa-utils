// demoNode.js
const { fetchWithSuspenseNode } = require('./utils/suspenseNode.ts');

function fetchUser() {
	return new Promise(resolve => setTimeout(() => resolve({ name: '张三' }), 1000));
}
function fetchUser2() {
	return new Promise(resolve => setTimeout(() => resolve({ name: '李四' }), 3000));
}

function main() {
	console.log('执行main方法')
	try {
		const user = fetchWithSuspenseNode('user-1', fetchUser);
		const user2 = fetchWithSuspenseNode('user-2', fetchUser2);
		console.log('用户数据:', user);
		console.log('用户数据2:', user2);
	} catch (e) {
		console.log('e', e);
		if (e instanceof Promise) {
			e.then(() => main());
		} else {
			console.error('请求出错', e);
		}
	}
}

main();
