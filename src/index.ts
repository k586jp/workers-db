import { WorkerEntrypoint } from 'cloudflare:workers'
 import { Md2HtmlService } from '../../workers-markdown2html/src/index'

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
        const query =
            'SELECT t.id, t.title, t.content_md, t.content_html, t.user_id, t.created_at, t.updated_at ' +
            'FROM article as t ' +
            'WHERE id = ? AND is_public = ?';
        const stmt = this.env.DB.prepare(query);
        const rows = await stmt.bind(articleId, true).all();
        const articles: Article[] = JSON.parse(JSON.stringify(rows.results)) || null;

        const md2html = new Md2html(articles, this.env);
        await md2html.newConvert();

        return md2html.get();
    }

}


class Md2html {

    private readonly articles: Article[];
    private readonly env: Env;

    constructor (articles: Article[], env: Env) {
        this.articles = articles;
        this.env = env;
    }

    get() {
        return this.articles;
    }

    async newConvert() {
        const count = this.articles.length;
        let run: Promise<D1Result<Record<string, unknown>>>[];
        for (let i = 0; i < count; i++) {
            if (this.articles[i].content_html === null) {
                const query =
                    'UPDATE article ' +
                    'SET content_html = ? ' +
                    'WHERE id = ?';
                const stmt = this.env.DB.prepare(query);
                this.articles[i].content_html = await this.env.MD2HTML.convert(this.articles[i].content_md);
                run.push(stmt.bind(this.articles[i].content_html, this.articles[i].id).run());
            }
        }
        await Promise.all(run);
    }

    async saveArticle() {
        const count = this.articles.length;
        if (count === 1) {
            const query =
                'INSERT INTO article (id, title, content_md, content_html, user_id)' +
                'VALUES (?, ?, ?, ?, ?)' +
                'ON CONFLICT(id) DO' +
                'UPDATE SET title = ?, content_md = ?, content_html = ?, updated_at = (DATETIME(\'now\'))';
            const stmt = this.env.DB.prepare(query);
            this.articles[0].content_html = await this.env.MD2HTML.convert(this.articles[0].content_md);
            let result: D1Result<Record<string, unknown>>;
            result = await stmt.bind(
               this.articles[0].id, this.articles[0].title, this.articles[0].content_md, this.articles[0].content_html, this.articles[0].user_id,
               this.articles[0].title, this.articles[0].content_md, this.articles[0].content_html
            ).run();
        }
    }

}


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
