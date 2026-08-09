import { WorkerEntrypoint } from 'cloudflare:workers';
import { Md2HtmlService } from '../../workers-markdown2html/src/index';

type Env = {
    DB: D1Database,
    MD2HTML: Service<Md2HtmlService>,
    SAKURA_BEARER_TOKEN: string
};

export type Article = {
    id: string,
    is_public: boolean,
    title: string,
    content_md: string,
    content_html: string | null,
    user_id: string,
    created_at: string,
    updated_at: string
};


export class K586ArticleId extends WorkerEntrypoint<Env> {

    async getArticle(articleId: string) {
        // 取得
        const query =
            'SELECT t.id, t.title, t.content_md, t.content_html, t.user_id, t.created_at, t.updated_at ' +
            'FROM article as t ' +
            'WHERE id = ? AND is_public = ?';
        const stmt = this.env.DB.prepare(query);
        const rows = await stmt.bind(articleId, true).all<Article>();
        const articles: Article[] = rows.results || null;

        // Markdown を HTML に変換
        const count = articles.length;
        let convertNumber: number[] = [];
        let convertPromises: Promise<string>[] = [];
        for (let i = 0; i < count; i++) {
            if (articles[i].content_html === null) {
                convertNumber.push(i);
                convertPromises.push(this.env.MD2HTML.convert(articles[i].content_md));
            }
        }
        const convert = await Promise.all(convertPromises);
        const convertCount = convertNumber.length;
        let stmtArray: D1PreparedStatement[] = [];
        for (let j = 0; j < convertCount; j++) {
            const i = convertNumber[j];
            articles[i].content_html = convert[j];
            const query =
                'UPDATE article ' +
                'SET content_html = ? ' +
                'WHERE id = ?';
            stmtArray.push(this.env.DB.prepare(query).bind(articles[i].content_html, articles[i].id));
        }
        await this.env.DB.batch(stmtArray);
        return articles;
    }

}


function sleep(seconds: number): Promise<void> {
    return new Promise(
        function (resolve) {
            setTimeout(resolve, seconds * 1000);
        }
    );
}

// class Md2html {
//
//     private readonly articles: Article[];
//
//     constructor (articles: Article[]) {
//         this.articles = articles;
//     }
//
//     get() {
//         return this.articles;
//     }
//
//     async newConvert(env: Env): Promise<void> {
//         const count = this.articles.length;
//         let convertNumber: number[] = [];
//         let convertPromises: Promise<string>[] = [];
//         for (let i = 0; i < count; i++) {
//             if (this.articles[i].content_html === null) {
//                 convertNumber.push(i);
//                 // convertPromises.push(this.env.MD2HTML.convert(this.articles[i].content_md));
//                 await env.MD2HTML.convert(this.articles[i].content_md);
//             }
//         }
//         // const convert = await Promise.all(convertPromises);
//         // const convertCount = convertNumber.length;
//         // let stmt: D1PreparedStatement[] = [];
//         // for (let j = 0; j < convertCount; j++) {
//         //     const i = convertNumber[j];
//         //     this.articles[i].content_html = convert[j];
//         //     const query =
//         //         'UPDATE article ' +
//         //         'SET content_html = ? ' +
//         //         'WHERE id = ?';
//         //     stmt.push(this.env.DB.prepare(query).bind(this.articles[i].content_html, this.articles[i].id));
//         // }
//         // await this.env.DB.batch(stmt);
//     }
//
//     async saveArticle(env: Env) {
//         const count = this.articles.length;
//         if (count === 1) {
//             const query =
//                 'INSERT INTO article (id, title, content_md, content_html, user_id)' +
//                 'VALUES (?, ?, ?, ?, ?)' +
//                 'ON CONFLICT(id) DO' +
//                 'UPDATE SET title = ?, content_md = ?, content_html = ?, updated_at = (DATETIME(\'now\'))';
//             const stmt = env.DB.prepare(query);
//             this.articles[0].content_html = await env.MD2HTML.convert(this.articles[0].content_md);
//             let retry = 0;
//             let result: D1Result<Record<string, unknown>> = null;
//             while (result === null || !result.success) {
//                 if (retry > 5) {
//                     throw new Error('記事の保存に失敗しました。');
//                 }
//                 await sleep(5 * retry);
//                 result = await stmt.bind(
//                     this.articles[0].id, this.articles[0].title, this.articles[0].content_md, this.articles[0].content_html, this.articles[0].user_id,
//                     this.articles[0].title, this.articles[0].content_md, this.articles[0].content_html
//                 ).run();
//                 retry++;
//             }
//         }
//     }
//
// }


// export class K586ArticleId extends WorkerEntrypoint<Env> {
//
//     async getArticle(articleId: string) {
//         const response = await fetch('https://api.k586.jp/article/id.php', {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'Authorization': `Bearer ${this.env.SAKURA_BEARER_TOKEN}`
//             },
//             body: JSON.stringify({ id: articleId })
//         });
//
//         if (!response.ok) {
//             throw new Error(`REST API Error: ${response.status}`);
//         }
//
//         const data: Article[] = await response.json();
//         return data;
//     }
//
// }


export default {
    async fetch() {
        return new Response('RPC Service Only', { status: 400 });
    }
}
