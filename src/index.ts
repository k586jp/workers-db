import { WorkerEntrypoint } from 'cloudflare:workers'

type Env = {
    DB: D1Database,
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
        const query = 'SELECT id, title, content_md, content_html, user_id, created_at, updated_at FROM article WHERE id = ?';
        const statement = this.env.DB.prepare(query);
        const rows = await statement.bind(articleId).all();
        const articles: Article[] = JSON.parse(JSON.stringify(rows.results)) || null;

        // if (post.content_html === null) {
            // markdown2html Worker を呼んで HTML に変換する
            // const generatedHtml = await this.env.MARKDOWN_SERVICE.convert(post.content_markdown)

            // 変換した HTML を D1 に保存（UPDATE）する
            // const updateStatement = this.env.DB.prepare('UPDATE posts SET content_html = ? WHERE id = ?')
            // await updateStatement.bind(generatedHtml, id).run()

            // 呼び出し元に返すオブジェクトの content_html を更新する
            // post.content_html = generatedHtml
        // }

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
