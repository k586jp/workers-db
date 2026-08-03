import { WorkerEntrypoint } from 'cloudflare:workers'
// import { md2html } from '../../workers-markdown2html/src/index'

type Env = {
    DB: D1Database,
//    MD2HTML: Service<md2html>,
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
            'SELECT t.id, t.title, t.content_md, t.content_html, t.user_id, t.created_at, t.updated_at' +
            'FROM article as t' +
            'WHERE id = ? AND is_public = ?';
        const stmt = this.env.DB.prepare(query);
        const rows = await stmt.bind(articleId, true).all();
        const articles: Article[] = JSON.parse(JSON.stringify(rows.results)) || null;
        const count = articles.length;

        for (let i = 0; i < count; i++) {
            if (articles[i].content_html === null) {
                const updQuery =
                    'UPDATE article' +
                    'SET content_html = ?' +
                    'WHERE id = ?';
                // const updStmt = this.env.DB.prepare(updQuery);
                // articles[i].content_html = await this.env.MD2HTML.convert(articles[i].content_md);
                // await updStmt.bind(articles[i].content_html, articles[i].id).run();
            }
        }

        return articles;
    }

    // async saveArticle(id: string, title: string, markdown: string): Promise<void> {
        // 事前に markdown2html で HTML 化しておく
        // const htmlContent = await this.env.MARKDOWN_SERVICE.convert(markdown)

        // const query = 'INSERT INTO posts (id, title, content_markdown, content_html) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET title = ?, content_markdown = ?, content_html = ?'
        // const statement = this.env.DB.prepare(query)

        // await statement.bind(id, title, markdown, htmlContent, title, markdown, htmlContent).run()
    // }

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
